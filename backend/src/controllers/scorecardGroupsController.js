import db from '../config/database.js';

// Get all groups for a team
export const getGroups = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    
    const result = await db.query(
      `SELECT * FROM scorecard_groups 
       WHERE organization_id = $1 AND team_id = $2 
       ORDER BY display_order ASC, created_at ASC`,
      [orgId, teamId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching scorecard groups:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scorecard groups'
    });
  }
};

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { name, description, color = '#3B82F6' } = req.body;
    
    // Get the max display_order for this org/team
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM scorecard_groups WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;
    
    const result = await db.query(
      `INSERT INTO scorecard_groups (organization_id, team_id, name, description, color, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orgId, teamId, name, description, color, nextOrder]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating scorecard group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scorecard group'
    });
  }
};

// Update a group
export const updateGroup = async (req, res) => {
  try {
    const { orgId, teamId, groupId } = req.params;
    const { name, description, color, is_expanded } = req.body;
    
    const result = await db.query(
      `UPDATE scorecard_groups
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           color = COALESCE($3, color),
           is_expanded = COALESCE($4, is_expanded),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND organization_id = $6 AND team_id = $7
       RETURNING *`,
      [name, description, color, is_expanded, groupId, orgId, teamId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating scorecard group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scorecard group'
    });
  }
};

// Delete a group
export const deleteGroup = async (req, res) => {
  try {
    const { orgId, teamId, groupId } = req.params;
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // First, unassign all metrics from this group
      await db.query(
        'UPDATE scorecard_metrics SET group_id = NULL WHERE group_id = $1',
        [groupId]
      );
      
      // Then delete the group
      const result = await db.query(
        'DELETE FROM scorecard_groups WHERE id = $1 AND organization_id = $2 AND team_id = $3 RETURNING id',
        [groupId, orgId, teamId]
      );
      
      if (result.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Group not found'
        });
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Group deleted successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting scorecard group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scorecard group'
    });
  }
};

// Update group order
export const updateGroupOrder = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { groups } = req.body; // Array of { id, display_order }
    
    if (!groups || !Array.isArray(groups)) {
      return res.status(400).json({
        success: false,
        message: 'Groups array is required'
      });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // Update each group's display_order
      for (const group of groups) {
        await db.query(
          'UPDATE scorecard_groups SET display_order = $1 WHERE id = $2 AND organization_id = $3',
          [group.display_order, group.id, orgId]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Group order updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating group order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update group order'
    });
  }
};

// Move a metric to a different group
export const moveMetricToGroup = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { metricId, groupId } = req.body;
    
    const result = await db.query(
      `UPDATE scorecard_metrics
       SET group_id = $1
       WHERE id = $2 AND organization_id = $3 AND team_id = $4
       RETURNING *`,
      [groupId, metricId, orgId, teamId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error moving metric to group:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move metric to group'
    });
  }
};