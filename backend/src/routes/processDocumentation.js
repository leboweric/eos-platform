import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { storageFactory } from '../services/storage/StorageFactory.js';

const router = express.Router();

// Get all processes for an organization
router.get('/', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category, status, methodology_type } = req.query;
    
    let sql = `
      SELECT 
        pd.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        COUNT(DISTINCT ps.id) as step_count,
        COUNT(DISTINCT pa.id) as attachment_count,
        COUNT(DISTINCT pack.id) as acknowledgment_count,
        ROUND(AVG(pack.quiz_score)) as avg_quiz_score
      FROM process_documents pd
      LEFT JOIN users u ON pd.owner_user_id = u.id
      LEFT JOIN process_steps ps ON pd.id = ps.process_document_id
      LEFT JOIN process_attachments pa ON pd.id = pa.process_document_id
      LEFT JOIN process_acknowledgments pack ON pd.id = pack.process_document_id
      WHERE pd.organization_id = $1
        AND pd.archived_at IS NULL
    `;
    
    const params = [organizationId];
    let paramIndex = 2;
    
    if (category) {
      sql += ` AND pd.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (status) {
      sql += ` AND pd.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (methodology_type) {
      sql += ` AND pd.methodology_type = $${paramIndex}`;
      params.push(methodology_type);
      paramIndex++;
    }
    
    sql += ` 
      GROUP BY pd.id, u.first_name, u.last_name
      ORDER BY pd.is_core_process DESC, pd.category, pd.name
    `;
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching processes:', error);
    res.status(500).json({ error: 'Failed to fetch processes' });
  }
});

// Get single process with all details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    
    // Get process document
    const processResult = await query(
      `SELECT pd.*, CONCAT(u.first_name, ' ', u.last_name) as owner_name
       FROM process_documents pd
       LEFT JOIN users u ON pd.owner_user_id = u.id
       WHERE pd.id = $1 AND pd.organization_id = $2`,
      [id, organizationId]
    );
    
    if (processResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    const process = processResult.rows[0];
    
    // Get steps if internal storage
    if (process.storage_type === 'internal') {
      const stepsResult = await query(
        'SELECT * FROM process_steps WHERE process_document_id = $1 ORDER BY step_number',
        [id]
      );
      
      // For each step, get its attachments
      for (const step of stepsResult.rows) {
        const stepAttachmentsResult = await query(
          `SELECT id, file_name, file_type, file_size, 
           encode(file_data, 'base64') as file_data_base64,
           uploaded_at
           FROM process_attachments 
           WHERE process_document_id = $1 AND step_id = $2`,
          [id, step.id]
        );
        
        // Convert attachments to the format expected by frontend
        step.attachments = stepAttachmentsResult.rows.map(att => ({
          id: att.id,
          file_name: att.file_name,
          name: att.file_name,  // Compatibility
          file_type: att.file_type,
          type: att.file_type,  // Compatibility
          file_size: att.file_size,
          size: att.file_size,  // Compatibility
          file_data: att.file_data_base64 ? `data:${att.file_type};base64,${att.file_data_base64}` : null,
          url: att.file_data_base64 ? `data:${att.file_type};base64,${att.file_data_base64}` : null,
          isImage: att.file_type && att.file_type.startsWith('image/'),
          uploadedAt: att.uploaded_at
        }));
      }
      
      process.steps = stepsResult.rows;
    }
    
    // Get process-level attachments (not tied to specific steps)
    const attachmentsResult = await query(
      `SELECT id, file_name, file_type, file_size,
       encode(file_data, 'base64') as file_data_base64,
       uploaded_at
       FROM process_attachments 
       WHERE process_document_id = $1 AND step_id IS NULL`,
      [id]
    );
    process.attachments = attachmentsResult.rows;
    
    // Get user's acknowledgment status
    const ackResult = await query(
      'SELECT * FROM process_acknowledgments WHERE process_document_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    process.user_acknowledgment = ackResult.rows[0] || null;
    
    res.json(process);
  } catch (error) {
    console.error('Error fetching process:', error);
    res.status(500).json({ error: 'Failed to fetch process' });
  }
});

// Create new process
router.post('/', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      name,
      category,
      process_type,
      description,
      purpose,
      outcomes,
      storage_type,
      methodology_type,
      is_core_process,
      steps,
      external_url,
      external_file_id
    } = req.body;
    
    // Start transaction
    await query('BEGIN');
    
    // Create process document
    const processResult = await query(
      `INSERT INTO process_documents (
        organization_id, name, category, process_type, owner_user_id,
        description, purpose, outcomes, storage_type, methodology_type,
        is_core_process, content, external_url, external_file_id,
        created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        organizationId, name, category, process_type || 'core_process', req.user.id,
        description, purpose, outcomes, storage_type || 'internal', methodology_type,
        is_core_process || false, 
        storage_type === 'internal' ? JSON.stringify(steps) : null,
        external_url, external_file_id,
        req.user.id, 'draft'
      ]
    );
    
    const process = processResult.rows[0];
    
    // If internal storage, create steps
    if (storage_type === 'internal' && steps && steps.length > 0) {
      for (const step of steps) {
        // Insert the step first
        const stepResult = await query(
          `INSERT INTO process_steps (
            process_document_id, step_number, title, description, bullets,
            responsible_role, estimated_time, tools_required, attachments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            process.id, step.step_number, step.title, step.description,
            JSON.stringify(step.bullets), step.responsible_role,
            step.estimated_time, step.tools_required,
            JSON.stringify(step.attachments || [])
          ]
        );
        
        const stepId = stepResult.rows[0].id;
        
        // If step has attachments, save them to process_attachments table
        if (step.attachments && step.attachments.length > 0) {
          for (const attachment of step.attachments) {
            // Extract base64 data if present
            let fileData = null;
            if (attachment.file_data || attachment.url) {
              const dataUrl = attachment.file_data || attachment.url;
              if (dataUrl.startsWith('data:')) {
                // Extract base64 content after the comma
                const base64Data = dataUrl.split(',')[1];
                fileData = Buffer.from(base64Data, 'base64');
              }
            }
            
            await query(
              `INSERT INTO process_attachments (
                process_document_id, step_id, file_name, file_type, file_size,
                file_data, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                process.id, stepId, 
                attachment.file_name || attachment.name,
                attachment.file_type || attachment.type,
                attachment.file_size || attachment.size,
                fileData,
                req.user.id
              ]
            );
          }
        }
      }
    }
    
    await query('COMMIT');
    res.status(201).json(process);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating process:', error);
    res.status(500).json({ error: 'Failed to create process' });
  }
});

// Update process
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    // Check ownership
    const checkResult = await query(
      'SELECT * FROM process_documents WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    const oldProcess = checkResult.rows[0];
    
    await query('BEGIN');
    
    // Record change history
    await query(
      `INSERT INTO process_change_history (
        process_document_id, version_from, version_to, changed_by,
        change_type, change_summary, previous_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id, oldProcess.version, updates.version || oldProcess.version,
        req.user.id, 'content', 'Process updated', JSON.stringify(oldProcess)
      ]
    );
    
    // Update process document
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'organization_id' && key !== 'steps') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id, organizationId);
    
    const updateResult = await query(
      `UPDATE process_documents 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    
    // Update steps if provided
    if (updates.steps && updates.storage_type === 'internal') {
      // Delete existing steps and attachments
      await query('DELETE FROM process_attachments WHERE process_document_id = $1', [id]);
      await query('DELETE FROM process_steps WHERE process_document_id = $1', [id]);
      
      // Insert new steps
      for (const step of updates.steps) {
        // Insert the step first
        const stepResult = await query(
          `INSERT INTO process_steps (
            process_document_id, step_number, title, description, bullets,
            responsible_role, estimated_time, tools_required, attachments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id`,
          [
            id, step.step_number, step.title, step.description,
            JSON.stringify(step.bullets), step.responsible_role,
            step.estimated_time, step.tools_required,
            JSON.stringify(step.attachments || [])
          ]
        );
        
        const stepId = stepResult.rows[0].id;
        
        // If step has attachments, save them to process_attachments table
        if (step.attachments && step.attachments.length > 0) {
          for (const attachment of step.attachments) {
            // Extract base64 data if present
            let fileData = null;
            if (attachment.file_data || attachment.url) {
              const dataUrl = attachment.file_data || attachment.url;
              if (dataUrl.startsWith('data:')) {
                // Extract base64 content after the comma
                const base64Data = dataUrl.split(',')[1];
                fileData = Buffer.from(base64Data, 'base64');
              }
            }
            
            await query(
              `INSERT INTO process_attachments (
                process_document_id, step_id, file_name, file_type, file_size,
                file_data, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                id, stepId,
                attachment.file_name || attachment.name,
                attachment.file_type || attachment.type,
                attachment.file_size || attachment.size,
                fileData,
                req.user.id
              ]
            );
          }
        }
      }
    }
    
    await query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating process:', error);
    res.status(500).json({ error: 'Failed to update process' });
  }
});

// Acknowledge process
router.post('/:id/acknowledge', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { training_completed, quiz_score, feedback } = req.body;
    
    // Verify process exists
    const checkResult = await query(
      'SELECT version FROM process_documents WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    const process = checkResult.rows[0];
    
    // Create or update acknowledgment
    const result = await query(
      `INSERT INTO process_acknowledgments (
        process_document_id, user_id, version_acknowledged,
        training_completed, quiz_score, feedback
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (process_document_id, user_id)
      DO UPDATE SET
        acknowledged_at = NOW(),
        version_acknowledged = $3,
        training_completed = $4,
        quiz_score = $5,
        feedback = $6
      RETURNING *`,
      [id, req.user.id, process.version, training_completed, quiz_score, feedback]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error acknowledging process:', error);
    res.status(500).json({ error: 'Failed to acknowledge process' });
  }
});

// Get process templates
router.get('/templates/list', authenticate, async (req, res) => {
  try {
    const { methodology_type, industry, category } = req.query;
    
    let sql = 'SELECT * FROM process_templates WHERE is_public = true';
    const params = [];
    let paramIndex = 1;
    
    if (methodology_type) {
      sql += ` AND methodology_type = $${paramIndex}`;
      params.push(methodology_type);
      paramIndex++;
    }
    
    if (industry) {
      sql += ` AND industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }
    
    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    sql += ' ORDER BY times_used DESC, name';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create process from template
router.post('/templates/:templateId/use', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { templateId } = req.params;
    const { name, category, team_id } = req.body;
    
    // Get template
    const templateResult = await query(
      'SELECT * FROM process_templates WHERE id = $1',
      [templateId]
    );
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const template = templateResult.rows[0];
    
    await query('BEGIN');
    
    // Create process from template
    const processResult = await query(
      `INSERT INTO process_documents (
        organization_id, team_id, name, category, process_type,
        owner_user_id, description, storage_type, methodology_type,
        content, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        organizationId, team_id, name || template.name, 
        category || template.category, 'core_process',
        req.user.id, template.description, 'internal', 
        template.methodology_type, template.content,
        req.user.id, 'draft'
      ]
    );
    
    const process = processResult.rows[0];
    
    // Create steps from template
    if (template.content && template.content.steps) {
      for (const step of template.content.steps) {
        await query(
          `INSERT INTO process_steps (
            process_document_id, step_number, title, bullets
          ) VALUES ($1, $2, $3, $4)`,
          [
            process.id, step.number, step.title,
            JSON.stringify(step.bullets)
          ]
        );
      }
    }
    
    // Update template usage count
    await query(
      'UPDATE process_templates SET times_used = times_used + 1 WHERE id = $1',
      [templateId]
    );
    
    await query('COMMIT');
    res.status(201).json(process);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating from template:', error);
    res.status(500).json({ error: 'Failed to create from template' });
  }
});

// Sync with external storage
router.post('/:id/sync', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    
    // Get process
    const processResult = await query(
      'SELECT * FROM process_documents WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    
    if (processResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    const process = processResult.rows[0];
    
    if (process.storage_type === 'internal') {
      return res.status(400).json({ error: 'Process uses internal storage' });
    }
    
    // Get storage configuration for organization
    const orgResult = await query(
      'SELECT cloud_storage_config FROM organizations WHERE id = $1',
      [organizationId]
    );
    
    const storageConfig = orgResult.rows[0]?.cloud_storage_config;
    
    if (!storageConfig) {
      return res.status(400).json({ error: 'Cloud storage not configured' });
    }
    
    // Use storageFactory to get appropriate adapter
    const storage = storageFactory.createAdapter(process.storage_type, storageConfig);
    
    // Sync content from external storage
    const syncedContent = await storage.getFile(process.external_file_id);
    
    // Update process with synced content
    await query(
      `UPDATE process_documents 
       SET content = $1, external_last_synced = NOW()
       WHERE id = $2`,
      [JSON.stringify(syncedContent), id]
    );
    
    res.json({ success: true, synced_at: new Date() });
  } catch (error) {
    console.error('Error syncing process:', error);
    res.status(500).json({ error: 'Failed to sync process' });
  }
});

// Delete a process
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    
    // Check if process exists and belongs to this organization
    const checkResult = await query(
      'SELECT id FROM process_documents WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    // Delete the process (cascades to steps, attachments, and acknowledgments)
    await query(
      'DELETE FROM process_documents WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    
    res.json({ message: 'Process deleted successfully' });
  } catch (error) {
    console.error('Error deleting process:', error);
    res.status(500).json({ error: 'Failed to delete process' });
  }
});

// Export process to PDF
router.get('/:id/export', authenticate, async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    
    // Get complete process data
    const processResult = await query(
      `SELECT pd.*, u.name as owner_name
       FROM process_documents pd
       LEFT JOIN users u ON pd.owner_user_id = u.id
       WHERE pd.id = $1 AND pd.organization_id = $2`,
      [id, organizationId]
    );
    
    if (processResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }
    
    const process = processResult.rows[0];
    
    // Get steps
    const stepsResult = await query(
      'SELECT * FROM process_steps WHERE process_document_id = $1 ORDER BY step_number',
      [id]
    );
    
    process.steps = stepsResult.rows;
    
    // TODO: Generate PDF using a library like pdfkit or puppeteer
    // For now, return the data that would go into the PDF
    res.json({
      message: 'PDF export not yet implemented',
      data: process
    });
  } catch (error) {
    console.error('Error exporting process:', error);
    res.status(500).json({ error: 'Failed to export process' });
  }
});

export default router;