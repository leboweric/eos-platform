import db from '../config/database.js';

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
      WHERE i.organization_id = $1
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

// Create a new issue
export const createIssue = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { title, description, ownerId, timeline, teamId } = req.body;
    const createdById = req.user.id;
    
    // Get the next priority rank
    const maxRankResult = await db.query(
      'SELECT MAX(priority_rank) as max_rank FROM issues WHERE organization_id = $1 AND timeline = $2',
      [orgId, timeline || 'short_term']
    );
    const nextRank = (maxRankResult.rows[0].max_rank || 0) + 1;
    
    const result = await db.query(
      `INSERT INTO issues 
       (organization_id, team_id, created_by_id, owner_id, title, description, priority_rank, timeline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        orgId,
        teamId || '00000000-0000-0000-0000-000000000000',
        createdById,
        ownerId,
        title,
        description,
        nextRank,
        timeline || 'short_term'
      ]
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
    
    // Add resolved_at if status is being set to resolved
    if (status === 'resolved') {
      updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
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