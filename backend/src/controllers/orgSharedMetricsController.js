import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get all organization-level shared metrics (admin only)
export const getOrgSharedMetrics = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const query = `
      SELECT 
        sm.id,
        sm.organization_id,
        sm.name,
        sm.description,
        sm.shared_description,
        sm.data_source,
        sm.calculation_method,
        sm.update_frequency,
        sm.type,
        sm.value_type,
        sm.comparison_operator,
        sm.goal,
        sm.owner,
        sm.visible_to_teams,
        sm.created_at,
        sm.updated_at,
        COUNT(DISTINCT tms.team_id) as subscriber_count
      FROM scorecard_metrics sm
      LEFT JOIN team_metric_subscriptions tms ON sm.id = tms.source_metric_id AND tms.is_active = TRUE
      WHERE sm.organization_id = $1 
        AND sm.is_org_level = TRUE
        AND sm.is_shared = TRUE
      GROUP BY 
        sm.id, sm.organization_id, sm.name, sm.description, sm.shared_description,
        sm.data_source, sm.calculation_method, sm.update_frequency,
        sm.type, sm.value_type, sm.comparison_operator, sm.goal, sm.owner,
        sm.visible_to_teams, sm.created_at, sm.updated_at
      ORDER BY sm.name
    `;
    
    const result = await db.query(query, [orgId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching org-level shared metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization-level shared metrics'
    });
  }
};

// Create a new organization-level shared metric (admin only)
export const createOrgSharedMetric = async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      name,
      owner,
      goal,
      type,
      value_type,
      comparison_operator,
      description,
      shared_description,
      data_source,
      calculation_method,
      update_frequency,
      visible_to_teams
    } = req.body;
    
    // Validate required fields
    if (!name || !owner || goal === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, owner, goal, type'
      });
    }
    
    const metricId = uuidv4();
    
    const query = `
      INSERT INTO scorecard_metrics (
        id, organization_id, team_id, name, owner, goal, type, value_type, 
        comparison_operator, description, is_shared, is_org_level, 
        shared_description, data_source, calculation_method, update_frequency,
        visible_to_teams, created_at, updated_at
      ) VALUES (
        $1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE, $10, $11, $12, $13, $14,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;
    
    const values = [
      metricId,
      orgId,
      name,
      owner,
      goal,
      type,
      value_type || 'number',
      comparison_operator || 'greater_equal',
      description,
      shared_description,
      data_source,
      calculation_method,
      update_frequency,
      visible_to_teams || null
    ];
    
    const result = await db.query(query, values);
    
    res.status(201).json({
      success: true,
      message: 'Organization-level shared metric created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating org-level shared metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create organization-level shared metric'
    });
  }
};

// Update an organization-level shared metric (admin only)
export const updateOrgSharedMetric = async (req, res) => {
  try {
    const { orgId, metricId } = req.params;
    const {
      name,
      owner,
      goal,
      type,
      value_type,
      comparison_operator,
      description,
      shared_description,
      data_source,
      calculation_method,
      update_frequency,
      visible_to_teams
    } = req.body;
    
    // Verify the metric exists and is org-level
    const checkQuery = `
      SELECT * FROM scorecard_metrics 
      WHERE id = $1 AND organization_id = $2 AND is_org_level = TRUE
    `;
    const checkResult = await db.query(checkQuery, [metricId, orgId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organization-level shared metric not found'
      });
    }
    
    const updateQuery = `
      UPDATE scorecard_metrics 
      SET 
        name = COALESCE($1, name),
        owner = COALESCE($2, owner),
        goal = COALESCE($3, goal),
        type = COALESCE($4, type),
        value_type = COALESCE($5, value_type),
        comparison_operator = COALESCE($6, comparison_operator),
        description = COALESCE($7, description),
        shared_description = COALESCE($8, shared_description),
        data_source = COALESCE($9, data_source),
        calculation_method = COALESCE($10, calculation_method),
        update_frequency = COALESCE($11, update_frequency),
        visible_to_teams = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND organization_id = $14
      RETURNING *
    `;
    
    const values = [
      name,
      owner,
      goal,
      type,
      value_type,
      comparison_operator,
      description,
      shared_description,
      data_source,
      calculation_method,
      update_frequency,
      visible_to_teams,
      metricId,
      orgId
    ];
    
    const result = await db.query(updateQuery, values);
    
    res.json({
      success: true,
      message: 'Organization-level shared metric updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating org-level shared metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization-level shared metric'
    });
  }
};

// Delete an organization-level shared metric (admin only)
export const deleteOrgSharedMetric = async (req, res) => {
  try {
    const { orgId, metricId } = req.params;
    
    // Check if any teams are subscribed
    const subscriberCheck = await db.query(
      'SELECT COUNT(*) as count FROM team_metric_subscriptions WHERE source_metric_id = $1 AND is_active = TRUE',
      [metricId]
    );
    
    const subscriberCount = parseInt(subscriberCheck.rows[0].count);
    
    if (subscriberCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete metric. ${subscriberCount} team(s) are currently subscribed to this metric.`
      });
    }
    
    // Delete the metric
    const deleteQuery = `
      DELETE FROM scorecard_metrics 
      WHERE id = $1 AND organization_id = $2 AND is_org_level = TRUE
      RETURNING *
    `;
    
    const result = await db.query(deleteQuery, [metricId, orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Organization-level shared metric not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Organization-level shared metric deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting org-level shared metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete organization-level shared metric'
    });
  }
};

// Get metric subscribers (which teams have subscribed)
export const getMetricSubscribers = async (req, res) => {
  try {
    const { orgId, metricId } = req.params;
    
    const query = `
      SELECT 
        tms.id as subscription_id,
        tms.team_id,
        t.name as team_name,
        tms.subscribed_at,
        tms.subscription_notes,
        u.first_name || ' ' || u.last_name as subscribed_by_name
      FROM team_metric_subscriptions tms
      JOIN teams t ON tms.team_id = t.id
      LEFT JOIN users u ON tms.subscribed_by = u.id
      WHERE tms.source_metric_id = $1 
        AND t.organization_id = $2
        AND tms.is_active = TRUE
      ORDER BY t.name
    `;
    
    const result = await db.query(query, [metricId, orgId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching metric subscribers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metric subscribers'
    });
  }
};
