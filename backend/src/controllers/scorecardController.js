import db from '../config/database.js';

// Helper function to check if a column exists
async function checkColumn(tableName, columnName) {
  try {
    const result = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking ${columnName} column:`, error);
    return false;
  }
}

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
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    
    // Build query based on available columns
    let selectColumns = 'id, name, goal, owner, type, created_at, updated_at';
    if (hasValueType) {
      selectColumns += ', value_type';
    }
    if (hasComparisonOperator) {
      selectColumns += ', comparison_operator';
    }
    
    // Get all metrics for the team
    const metricsQuery = `
      SELECT ${selectColumns}
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
    const { name, goal, owner, type = 'weekly', valueType = 'number', comparisonOperator = 'greater_equal' } = req.body;
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    
    // Build insert query based on available columns
    let columns = ['organization_id', 'team_id', 'name', 'goal', 'owner', 'type'];
    let values = [orgId, teamId, name, goal, owner, type];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];
    
    if (hasValueType) {
      columns.push('value_type');
      values.push(valueType);
      placeholders.push(`$${values.length}`);
    }
    if (hasComparisonOperator) {
      columns.push('comparison_operator');
      values.push(comparisonOperator);
      placeholders.push(`$${values.length}`);
    }
    
    const query = `
      INSERT INTO scorecard_metrics (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
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
    const { name, goal, owner, type, valueType, comparisonOperator } = req.body;
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    
    // Build update query based on available columns
    let setClauses = ['name = $1', 'goal = $2', 'owner = $3', 'type = $4'];
    let values = [name, goal, owner, type];
    
    if (hasValueType && valueType !== undefined) {
      values.push(valueType);
      setClauses.push(`value_type = $${values.length}`);
    }
    if (hasComparisonOperator && comparisonOperator !== undefined) {
      values.push(comparisonOperator);
      setClauses.push(`comparison_operator = $${values.length}`);
    }
    
    // Add the WHERE clause parameters
    values.push(metricId, orgId, teamId);
    
    const query = `
      UPDATE scorecard_metrics
      SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 2} AND organization_id = $${values.length - 1} AND team_id = $${values.length}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
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