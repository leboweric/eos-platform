import db from '../config/database.js';

// Helper function to get team members
async function getTeamMembers(orgId) {
  console.log('Getting team members for scorecard org:', orgId);
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
  
  console.log(`Found ${result.rows.length} team members for scorecard`);
  return result.rows;
}

// Get complete scorecard with metrics and scores
export const getScorecard = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    
    // Get all metrics for the team
    const metricsQuery = `
      SELECT id, name, goal, owner, type, created_at, updated_at
      FROM scorecard_metrics
      WHERE organization_id = $1 AND team_id = $2
      ORDER BY created_at ASC
    `;
    const metrics = await db.query(metricsQuery, [orgId, teamId]);
    
    // Get all scores for these metrics
    const scoresQuery = `
      SELECT metric_id, week_date, value
      FROM scorecard_scores
      WHERE metric_id IN (
        SELECT id FROM scorecard_metrics 
        WHERE organization_id = $1 AND team_id = $2
      )
    `;
    const scores = await db.query(scoresQuery, [orgId, teamId]);
    
    // Organize scores by metric and week
    const weeklyScores = {};
    scores.rows.forEach(score => {
      if (!weeklyScores[score.metric_id]) {
        weeklyScores[score.metric_id] = {};
      }
      // Format date as YYYY-MM-DD
      const weekDate = new Date(score.week_date).toISOString().split('T')[0];
      weeklyScores[score.metric_id][weekDate] = score.value;
    });
    
    // Get team members for the organization
    const teamMembers = await getTeamMembers(orgId);
    
    res.json({
      success: true,
      data: {
        metrics: metrics.rows,
        weeklyScores,
        teamMembers
      }
    });
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scorecard data'
    });
  }
};

// Create a new metric
export const createMetric = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { name, goal, owner, type = 'weekly' } = req.body;
    
    const query = `
      INSERT INTO scorecard_metrics (
        organization_id, team_id, name, goal, owner, type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, goal, owner, type, created_at, updated_at
    `;
    
    const result = await db.query(query, [orgId, teamId, name, goal, owner, type]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create metric'
    });
  }
};

// Update an existing metric
export const updateMetric = async (req, res) => {
  try {
    const { orgId, teamId, metricId } = req.params;
    const { name, goal, owner, type } = req.body;
    
    const query = `
      UPDATE scorecard_metrics
      SET name = $1, goal = $2, owner = $3, type = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND organization_id = $6 AND team_id = $7
      RETURNING id, name, goal, owner, type, created_at, updated_at
    `;
    
    const result = await db.query(query, [name, goal, owner, type, metricId, orgId, teamId]);
    
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
    console.error('Error updating metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update metric'
    });
  }
};

// Delete a metric
export const deleteMetric = async (req, res) => {
  try {
    const { orgId, teamId, metricId } = req.params;
    
    // Delete associated scores first
    await db.query('DELETE FROM scorecard_scores WHERE metric_id = $1', [metricId]);
    
    // Delete the metric
    const query = `
      DELETE FROM scorecard_metrics
      WHERE id = $1 AND organization_id = $2 AND team_id = $3
      RETURNING id
    `;
    
    const result = await db.query(query, [metricId, orgId, teamId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Metric not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Metric deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting metric:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete metric'
    });
  }
};

// Update a weekly score
export const updateScore = async (req, res) => {
  try {
    const { metricId, week, value } = req.body;
    
    // Convert week to proper date format
    const weekDate = new Date(week).toISOString().split('T')[0];
    
    // Upsert the score
    const query = `
      INSERT INTO scorecard_scores (metric_id, week_date, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (metric_id, week_date)
      DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP
      RETURNING metric_id, week_date, value
    `;
    
    const result = await db.query(query, [metricId, weekDate, value || null]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update score'
    });
  }
};