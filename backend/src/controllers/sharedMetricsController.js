import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Get all shared metrics in the organization
export const getSharedMetrics = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { teamId } = req.query; // Optional filter for team-specific view
    
    let query = `
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
        sm.created_by_team_id,
        t.name as created_by_team_name,
        sm.created_at,
        COUNT(DISTINCT tms.team_id) as subscriber_count,
        EXISTS(
          SELECT 1 FROM team_metric_subscriptions tms2 
          WHERE tms2.source_metric_id = sm.id 
          AND tms2.team_id = $2 
          AND tms2.is_active = TRUE
        ) as is_subscribed
      FROM scorecard_metrics sm
      LEFT JOIN teams t ON sm.created_by_team_id = t.id
      LEFT JOIN team_metric_subscriptions tms ON sm.id = tms.source_metric_id AND tms.is_active = TRUE
      WHERE sm.organization_id = $1 
        AND sm.is_shared = TRUE
    `;
    
    const params = [orgId, teamId || null];
    
    // Filter out metrics created by the requesting team if teamId provided
    if (teamId) {
      query += ` AND (sm.created_by_team_id != $2 OR sm.created_by_team_id IS NULL)`;
    }
    
    query += ` GROUP BY 
      sm.id, sm.organization_id, sm.name, sm.description, sm.shared_description,
      sm.data_source, sm.calculation_method, sm.update_frequency,
      sm.type, sm.value_type, sm.comparison_operator, sm.goal, sm.owner,
      sm.created_by_team_id, t.name, sm.created_at
      ORDER BY sm.name`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching shared metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared metrics'
    });
  }
};

// Share an existing metric
export const shareMetric = async (req, res) => {
  try {
    const { orgId, teamId, metricId } = req.params;
    const { shared_description, data_source, calculation_method, update_frequency } = req.body;
    
    // Verify the metric exists and belongs to this team
    const metricCheck = await db.query(
      'SELECT * FROM scorecard_metrics WHERE id = $1 AND organization_id = $2 AND team_id = $3',
      [metricId, orgId, teamId]
    );
    
    if (metricCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }
    
    // Update the metric to be shared
    const result = await db.query(
      `UPDATE scorecard_metrics 
       SET is_shared = TRUE,
           created_by_team_id = $1,
           shared_description = $2,
           data_source = $3,
           calculation_method = $4,
           update_frequency = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [teamId, shared_description, data_source, calculation_method, update_frequency, metricId]
    );
    
    res.json({
      success: true,
      message: 'Metric shared successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sharing metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share metric'
    });
  }
};

// Unshare a metric
export const unshareMetric = async (req, res) => {
  try {
    const { orgId, teamId, metricId } = req.params;
    
    // Verify the metric exists and belongs to this team
    const metricCheck = await db.query(
      'SELECT * FROM scorecard_metrics WHERE id = $1 AND organization_id = $2 AND team_id = $3',
      [metricId, orgId, teamId]
    );
    
    if (metricCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }
    
    // Check if other teams are subscribed
    const subscriberCheck = await db.query(
      'SELECT COUNT(*) as count FROM team_metric_subscriptions WHERE source_metric_id = $1 AND is_active = TRUE',
      [metricId]
    );
    
    if (parseInt(subscriberCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot unshare metric. ${subscriberCheck.rows[0].count} team(s) are currently using this metric.`
      });
    }
    
    // Update the metric to be unshared
    const result = await db.query(
      `UPDATE scorecard_metrics 
       SET is_shared = FALSE,
           created_by_team_id = NULL,
           shared_description = NULL,
           data_source = NULL,
           calculation_method = NULL,
           update_frequency = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [metricId]
    );
    
    res.json({
      success: true,
      message: 'Metric unshared successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error unsharing metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unshare metric'
    });
  }
};

// Subscribe a team to a shared metric
export const subscribeToMetric = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { source_metric_id, goal, subscription_notes } = req.body;
    const userId = req.user.id;
    
    // Verify the source metric exists and is shared
    const sourceMetric = await db.query(
      'SELECT * FROM scorecard_metrics WHERE id = $1 AND organization_id = $2 AND is_shared = TRUE',
      [source_metric_id, orgId]
    );
    
    if (sourceMetric.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shared metric not found'
      });
    }
    
    const source = sourceMetric.rows[0];
    
    // Check if already subscribed
    const existingSubscription = await db.query(
      'SELECT * FROM team_metric_subscriptions WHERE team_id = $1 AND source_metric_id = $2',
      [teamId, source_metric_id]
    );
    
    if (existingSubscription.rows.length > 0) {
      if (existingSubscription.rows[0].is_active) {
        return res.status(400).json({
          success: false,
          message: 'Team is already subscribed to this metric'
        });
      }
      
      // Reactivate existing subscription
      await db.query(
        'UPDATE team_metric_subscriptions SET is_active = TRUE WHERE id = $1',
        [existingSubscription.rows[0].id]
      );
      
      // Update the local metric with new goal if provided
      if (goal !== undefined) {
        await db.query(
          'UPDATE scorecard_metrics SET goal = $1 WHERE id = $2',
          [goal, existingSubscription.rows[0].local_metric_id]
        );
      }
      
      return res.json({
        success: true,
        message: 'Subscription reactivated',
        data: { local_metric_id: existingSubscription.rows[0].local_metric_id }
      });
    }
    
    // Create a local copy of the metric for this team
    const localMetricId = uuidv4();
    await db.query(
      `INSERT INTO scorecard_metrics 
       (id, organization_id, team_id, name, description, goal, type, value_type, 
        comparison_operator, owner, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        localMetricId,
        orgId,
        teamId,
        source.name,
        source.description || source.shared_description,
        goal || source.goal,
        source.type,
        source.value_type,
        source.comparison_operator,
        source.owner
      ]
    );
    
    // Create the subscription
    await db.query(
      `INSERT INTO team_metric_subscriptions 
       (id, team_id, source_metric_id, local_metric_id, subscribed_by, subscription_notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), teamId, source_metric_id, localMetricId, userId, subscription_notes]
    );
    
    res.json({
      success: true,
      message: 'Successfully subscribed to metric',
      data: { local_metric_id: localMetricId }
    });
  } catch (error) {
    console.error('Error subscribing to metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to subscribe to metric'
    });
  }
};

// Unsubscribe from a shared metric
export const unsubscribeFromMetric = async (req, res) => {
  try {
    const { orgId, teamId, subscriptionId } = req.params;
    
    // Verify the subscription exists and belongs to this team
    const subscription = await db.query(
      'SELECT * FROM team_metric_subscriptions WHERE id = $1 AND team_id = $2',
      [subscriptionId, teamId]
    );
    
    if (subscription.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }
    
    // Deactivate the subscription (don't delete, keep for history)
    await db.query(
      'UPDATE team_metric_subscriptions SET is_active = FALSE WHERE id = $1',
      [subscriptionId]
    );
    
    // Delete the local metric copy
    await db.query(
      'DELETE FROM scorecard_metrics WHERE id = $1',
      [subscription.rows[0].local_metric_id]
    );
    
    res.json({
      success: true,
      message: 'Successfully unsubscribed from metric'
    });
  } catch (error) {
    console.error('Error unsubscribing from metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe from metric'
    });
  }
};

// Get team's metric subscriptions
export const getTeamSubscriptions = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    
    const result = await db.query(
      `SELECT 
        tms.id,
        tms.source_metric_id,
        tms.local_metric_id,
        tms.subscribed_at,
        tms.subscription_notes,
        sm.name as metric_name,
        sm.shared_description,
        sm.data_source,
        sm.calculation_method,
        sm.update_frequency,
        lm.goal as local_goal,
        t.name as source_team_name
       FROM team_metric_subscriptions tms
       JOIN scorecard_metrics sm ON tms.source_metric_id = sm.id
       JOIN scorecard_metrics lm ON tms.local_metric_id = lm.id
       LEFT JOIN teams t ON sm.created_by_team_id = t.id
       WHERE tms.team_id = $1 AND tms.is_active = TRUE
       ORDER BY sm.name`,
      [teamId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching team subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team subscriptions'
    });
  }
};

// Sync scores from source metric to subscribed metrics
export const syncMetricScores = async (req, res) => {
  try {
    const { orgId, metricId } = req.params;
    const { from_date, to_date } = req.query;
    
    // Get all active subscriptions for this metric
    const subscriptions = await db.query(
      `SELECT local_metric_id 
       FROM team_metric_subscriptions 
       WHERE source_metric_id = $1 AND is_active = TRUE`,
      [metricId]
    );
    
    if (subscriptions.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No active subscriptions to sync'
      });
    }
    
    // Get scores from the source metric
    let scoreQuery = 'SELECT week_date, value FROM scorecard_scores WHERE metric_id = $1';
    const scoreParams = [metricId];
    
    if (from_date) {
      scoreQuery += ` AND week_date >= $${scoreParams.length + 1}`;
      scoreParams.push(from_date);
    }
    
    if (to_date) {
      scoreQuery += ` AND week_date <= $${scoreParams.length + 1}`;
      scoreParams.push(to_date);
    }
    
    const scores = await db.query(scoreQuery, scoreParams);
    
    // Sync scores to all subscribed metrics
    let syncCount = 0;
    for (const subscription of subscriptions.rows) {
      for (const score of scores.rows) {
        // Upsert score for each subscribed metric
        await db.query(
          `INSERT INTO scorecard_scores (id, metric_id, week_date, value)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (metric_id, week_date) 
           DO UPDATE SET value = $4`,
          [uuidv4(), subscription.local_metric_id, score.week_date, score.value]
        );
        syncCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Synced ${syncCount} score entries to ${subscriptions.rows.length} subscribed metrics`
    });
  } catch (error) {
    console.error('Error syncing metric scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync metric scores'
    });
  }
};