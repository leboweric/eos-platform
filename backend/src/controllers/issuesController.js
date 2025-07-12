import db from '../config/database.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to get team members
async function getTeamMembers(orgId) {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.role,
      u.first_name,
      u.last_name
     FROM users u
     WHERE u.organization_id = $1
     ORDER BY u.first_name, u.last_name`,
    [orgId]
  );
  
  return result.rows;
}

// Get all issues for an organization
export const getIssues = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { timeline } = req.query; // 'short_term' or 'long_term'
    
    let query = `
      SELECT 
        i.id,
        i.organization_id,
        i.team_id,
        i.created_by_id,
        i.owner_id,
        i.title,
        i.description,
        i.priority_rank,
        i.status,
        i.timeline,
        i.resolution_notes,
        i.resolved_at,
        i.created_at,
        i.updated_at,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        owner.first_name || ' ' || owner.last_name as owner_name,
        t.name as team_name,
        COUNT(DISTINCT ia.id) as attachment_count
      FROM issues i
      LEFT JOIN users creator ON i.created_by_id = creator.id
      LEFT JOIN users owner ON i.owner_id = owner.id
      LEFT JOIN teams t ON i.team_id = t.id
      LEFT JOIN issue_attachments ia ON ia.issue_id = i.id
      WHERE i.organization_id = $1 AND i.archived = FALSE
    `;
    
    const params = [orgId];
    
    if (timeline) {
      query += ` AND i.timeline = $2`;
      params.push(timeline);
    }
    
    query += ` GROUP BY i.id, creator.first_name, creator.last_name, owner.first_name, owner.last_name, t.name
               ORDER BY i.priority_rank ASC, i.created_at DESC`;
    
    const issues = await db.query(query, params);
    
    // Get team members for the organization
    const teamMembers = await getTeamMembers(orgId);
    
    res.json({
      success: true,
      data: {
        issues: issues.rows,
        teamMembers
      }
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issues'
    });
  }
};

// Helper function to check if timeline column exists
async function checkTimelineColumn() {
  try {
    const result = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'issues' AND column_name = 'timeline'`
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking timeline column:', error);
    return false;
  }
}

// Create a new issue
export const createIssue = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { title, description, ownerId, timeline, teamId } = req.body;
    const createdById = req.user.id;
    
    // Check if timeline column exists
    const hasTimelineColumn = await checkTimelineColumn();
    
    // Get the next priority rank
    let maxRankQuery = 'SELECT MAX(priority_rank) as max_rank FROM issues WHERE organization_id = $1';
    let maxRankParams = [orgId];
    
    if (hasTimelineColumn) {
      maxRankQuery += ' AND timeline = $2';
      maxRankParams.push(timeline || 'short_term');
    }
    
    const maxRankResult = await db.query(maxRankQuery, maxRankParams);
    const nextRank = (maxRankResult.rows[0].max_rank || 0) + 1;
    
    // Build insert query based on available columns
    let columns = ['organization_id', 'team_id', 'created_by_id', 'owner_id', 'title', 'description', 'priority_rank'];
    let values = [
      orgId,
      teamId && teamId !== '00000000-0000-0000-0000-000000000000' ? teamId : null,
      createdById,
      ownerId,
      title,
      description,
      nextRank
    ];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
    
    if (hasTimelineColumn) {
      columns.push('timeline');
      values.push(timeline || 'short_term');
      placeholders.push('$8');
    }
    
    const result = await db.query(
      `INSERT INTO issues (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create issue'
    });
  }
};

// Update an issue
export const updateIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    const { title, description, ownerId, status, timeline, resolutionNotes } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (ownerId !== undefined) {
      updateFields.push(`owner_id = $${paramCount++}`);
      values.push(ownerId);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (timeline !== undefined) {
      updateFields.push(`timeline = $${paramCount++}`);
      values.push(timeline);
    }
    if (resolutionNotes !== undefined) {
      updateFields.push(`resolution_notes = $${paramCount++}`);
      values.push(resolutionNotes);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(issueId);
    values.push(orgId);
    
    const query = `
      UPDATE issues
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue'
    });
  }
};

// Delete an issue
export const deleteIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      'DELETE FROM issues WHERE id = $1 AND organization_id = $2 RETURNING id',
      [issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete issue'
    });
  }
};

// Update issue priority/order
export const updateIssuePriority = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { updates } = req.body; // Array of { id, priority_rank }
    
    // Use a transaction to update all priorities atomically
    await db.query('BEGIN');
    
    try {
      for (const update of updates) {
        await db.query(
          'UPDATE issues SET priority_rank = $1 WHERE id = $2 AND organization_id = $3',
          [update.priority_rank, update.id, orgId]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Issue priorities updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating issue priorities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue priorities'
    });
  }
};

// Upload attachment
export const uploadAttachment = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    const uploadedBy = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { originalname, buffer, size, mimetype } = req.file;
    
    // Verify the issue exists and belongs to this organization
    const issueCheck = await db.query(
      'SELECT id FROM issues WHERE id = $1 AND organization_id = $2',
      [issueId, orgId]
    );
    
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    // Insert the attachment
    const result = await db.query(
      `INSERT INTO issue_attachments 
       (id, issue_id, uploaded_by, file_name, file_data, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, issue_id, uploaded_by, file_name, file_size, mime_type, created_at`,
      [uuidv4(), issueId, uploadedBy, originalname, buffer, size, mimetype]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment'
    });
  }
};

// Get attachments for an issue
export const getAttachments = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      `SELECT 
        ia.id,
        ia.file_name,
        ia.file_size,
        ia.mime_type,
        ia.created_at,
        u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM issue_attachments ia
       JOIN users u ON ia.uploaded_by = u.id
       JOIN issues i ON ia.issue_id = i.id
       WHERE ia.issue_id = $1 AND i.organization_id = $2
       ORDER BY ia.created_at DESC`,
      [issueId, orgId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attachments'
    });
  }
};

// Download attachment
export const downloadAttachment = async (req, res) => {
  try {
    const { orgId, issueId, attachmentId } = req.params;
    
    const result = await db.query(
      `SELECT 
        ia.file_name,
        ia.file_data,
        ia.mime_type
       FROM issue_attachments ia
       JOIN issues i ON ia.issue_id = i.id
       WHERE ia.id = $1 AND ia.issue_id = $2 AND i.organization_id = $3`,
      [attachmentId, issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    const { file_name, file_data, mime_type } = result.rows[0];
    
    // Set headers for file download
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    res.setHeader('Content-Length', file_data.length);
    
    // Send the file data
    res.send(file_data);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download attachment'
    });
  }
};

// Delete attachment
export const deleteAttachment = async (req, res) => {
  try {
    const { orgId, issueId, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Check if user can delete (either uploaded by them or they're an admin)
    const result = await db.query(
      `DELETE FROM issue_attachments ia
       USING issues i
       WHERE ia.id = $1 
       AND ia.issue_id = $2 
       AND i.id = ia.issue_id
       AND i.organization_id = $3
       AND (ia.uploaded_by = $4 OR $5 = 'admin')
       RETURNING ia.id`,
      [attachmentId, issueId, orgId, userId, req.user.role]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment'
    });
  }
};

// Archive all closed issues
export const archiveClosedIssues = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { timeline } = req.body; // Optional: archive only for specific timeline
    
    let query = `
      UPDATE issues 
      SET archived = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 
      AND status = 'closed' 
      AND archived = FALSE
    `;
    
    const params = [orgId];
    
    if (timeline) {
      query += ` AND timeline = $2`;
      params.push(timeline);
    }
    
    query += ` RETURNING id`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      message: `Archived ${result.rows.length} closed issue(s)`,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error archiving closed issues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive closed issues'
    });
  }
};