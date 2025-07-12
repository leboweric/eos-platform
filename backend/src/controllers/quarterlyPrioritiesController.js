import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get all priorities for a quarter
export const getQuarterlyPriorities = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { quarter, year } = req.query;
    
    // Get predictions
    const predictionsResult = await query(
      `SELECT * FROM quarterly_predictions 
       WHERE organization_id = $1 AND quarter = $2 AND year = $3`,
      [orgId, quarter || 'Q1', parseInt(year) || new Date().getFullYear()]
    );
    
    // Get all priorities
    const prioritiesResult = await query(
      `SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        array_agg(
          json_build_object(
            'id', m.id,
            'title', m.title,
            'completed', m.completed,
            'due_date', m.due_date
          ) ORDER BY m.due_date
        ) FILTER (WHERE m.id IS NOT NULL) as milestones
       FROM quarterly_priorities p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN priority_milestones m ON p.id = m.priority_id
       WHERE p.organization_id = $1 
         AND p.quarter = $2 
         AND p.year = $3
       GROUP BY p.id, u.first_name, u.last_name, u.email
       ORDER BY p.is_company_priority DESC, p.created_at`,
      [orgId, quarter || 'Q1', parseInt(year) || new Date().getFullYear()]
    );
    
    // Get latest updates for each priority
    const priorityIds = prioritiesResult.rows.map(p => p.id);
    let updates = {};
    
    if (priorityIds.length > 0) {
      const updatesResult = await query(
        `SELECT DISTINCT ON (priority_id) 
          priority_id,
          update_text,
          created_at,
          u.first_name || ' ' || u.last_name as author_name
         FROM priority_updates pu
         JOIN users u ON pu.created_by = u.id
         WHERE priority_id = ANY($1)
         ORDER BY priority_id, created_at DESC`,
        [priorityIds]
      );
      
      updatesResult.rows.forEach(update => {
        updates[update.priority_id] = {
          text: update.update_text,
          date: update.created_at,
          author: update.author_name
        };
      });
    }
    
    // Format response
    const priorities = prioritiesResult.rows.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      owner: {
        id: p.owner_id,
        name: p.owner_name,
        email: p.owner_email
      },
      dueDate: p.due_date,
      status: p.status,
      progress: p.progress,
      isCompanyPriority: p.is_company_priority,
      milestones: p.milestones || [],
      latestUpdate: updates[p.id] || null
    }));
    
    // Separate company and individual priorities
    const companyPriorities = priorities.filter(p => p.isCompanyPriority);
    const individualPriorities = priorities.filter(p => !p.isCompanyPriority);
    
    // Group individual priorities by owner
    const teamMemberPriorities = {};
    individualPriorities.forEach(p => {
      if (!teamMemberPriorities[p.owner.id]) {
        teamMemberPriorities[p.owner.id] = [];
      }
      teamMemberPriorities[p.owner.id].push(p);
    });
    
    res.json({
      success: true,
      data: {
        predictions: predictionsResult.rows[0] || {
          revenue: { target: 0, current: 0 },
          profit: { target: 0, current: 0 },
          measurables: { onTrack: 0, total: 0 }
        },
        companyPriorities,
        teamMemberPriorities,
        teamMembers: await getTeamMembers(orgId)
      }
    });
  } catch (error) {
    console.error('Get quarterly priorities error:', error);
    res.status(500).json({ error: 'Failed to fetch quarterly priorities' });
  }
};

// Create a new priority
export const createPriority = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { 
      title, 
      description, 
      ownerId, 
      dueDate, 
      quarter, 
      year,
      isCompanyPriority,
      milestones = []
    } = req.body;
    
    const priorityId = uuidv4();
    
    // Create priority
    const result = await query(
      `INSERT INTO quarterly_priorities 
       (id, organization_id, title, description, owner_id, due_date, quarter, year, 
        is_company_priority, status, progress, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'on-track', 0, $10)
       RETURNING *`,
      [priorityId, orgId, title, description, ownerId, dueDate, quarter, year, 
       isCompanyPriority, req.user.id]
    );
    
    // Create milestones if provided
    if (milestones.length > 0) {
      const milestoneValues = milestones.map(m => 
        `('${uuidv4()}', '${priorityId}', '${m.title}', '${m.dueDate}', false)`
      ).join(',');
      
      await query(
        `INSERT INTO priority_milestones (id, priority_id, title, due_date, completed)
         VALUES ${milestoneValues}`
      );
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create priority error:', error);
    res.status(500).json({ error: 'Failed to create priority' });
  }
};

// Update a priority
export const updatePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { title, description, status, progress } = req.body;
    
    const result = await query(
      `UPDATE quarterly_priorities 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           progress = COALESCE($4, progress),
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [title, description, status, progress, priorityId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
};

// Delete a priority
export const deletePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    
    await query(
      `DELETE FROM quarterly_priorities 
       WHERE id = $1 AND organization_id = $2`,
      [priorityId, orgId]
    );
    
    res.json({
      success: true,
      message: 'Priority deleted successfully'
    });
  } catch (error) {
    console.error('Delete priority error:', error);
    res.status(500).json({ error: 'Failed to delete priority' });
  }
};

// Update predictions
export const updatePredictions = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { quarter, year, revenue, profit, measurables } = req.body;
    
    // Upsert predictions
    const result = await query(
      `INSERT INTO quarterly_predictions 
       (id, organization_id, quarter, year, revenue_target, revenue_current, 
        profit_target, profit_current, measurables_on_track, measurables_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (organization_id, quarter, year) 
       DO UPDATE SET
         revenue_target = $5,
         revenue_current = $6,
         profit_target = $7,
         profit_current = $8,
         measurables_on_track = $9,
         measurables_total = $10,
         updated_at = NOW()
       RETURNING *`,
      [
        uuidv4(), orgId, quarter, year,
        revenue.target, revenue.current,
        profit.target, profit.current,
        measurables.onTrack, measurables.total
      ]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update predictions error:', error);
    res.status(500).json({ error: 'Failed to update predictions' });
  }
};

// Create milestone
export const createMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { title, dueDate } = req.body;
    
    const result = await query(
      `INSERT INTO priority_milestones 
       (id, priority_id, title, due_date, completed)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [uuidv4(), priorityId, title, dueDate]
    );
    
    // Update priority progress
    await updatePriorityProgress(priorityId);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
};

// Update milestone
export const updateMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId, milestoneId } = req.params;
    const { title, dueDate, completed } = req.body;
    
    const result = await query(
      `UPDATE priority_milestones 
       SET title = COALESCE($1, title),
           due_date = COALESCE($2, due_date),
           completed = COALESCE($3, completed),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title, dueDate, completed, milestoneId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    // Update priority progress based on milestones
    await updatePriorityProgress(result.rows[0].priority_id);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
};

// Delete milestone
export const deleteMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId, milestoneId } = req.params;
    
    const result = await query(
      `DELETE FROM priority_milestones 
       WHERE id = $1 AND priority_id = $2
       RETURNING priority_id`,
      [milestoneId, priorityId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    
    // Update priority progress
    await updatePriorityProgress(priorityId);
    
    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
};

// Add update to priority
export const addPriorityUpdate = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { updateText, statusChange } = req.body;
    
    const result = await query(
      `INSERT INTO priority_updates 
       (id, priority_id, update_text, status_change, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), priorityId, updateText, statusChange, req.user.id]
    );
    
    // If status changed, update the priority
    if (statusChange) {
      await query(
        `UPDATE quarterly_priorities 
         SET status = $1 
         WHERE id = $2`,
        [statusChange, priorityId]
      );
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add priority update error:', error);
    res.status(500).json({ error: 'Failed to add update' });
  }
};

// Helper function to get team members
async function getTeamMembers(orgId) {
  const result = await query(
    `SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.role,
      d.name as department
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.organization_id = $1
     ORDER BY u.first_name, u.last_name`,
    [orgId]
  );
  
  return result.rows;
}

// Helper function to update priority progress based on milestones
async function updatePriorityProgress(priorityId) {
  const result = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE completed = true) as completed
     FROM priority_milestones
     WHERE priority_id = $1`,
    [priorityId]
  );
  
  const { total, completed } = result.rows[0];
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  await query(
    `UPDATE quarterly_priorities 
     SET progress = $1 
     WHERE id = $2`,
    [progress, priorityId]
  );
}