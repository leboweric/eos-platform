import db from '../config/database.js';
import { getUserTeamContext } from '../utils/teamUtils.js';

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
    const userId = req.user.id;
    
    // Get user's team context
    const userTeam = await getUserTeamContext(userId, orgId);
    const isLeadership = userTeam && userTeam.is_leadership_team;
    console.log('User team context for scorecard:', userTeam);
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    const hasDescription = await checkColumn('scorecard_metrics', 'description');
    
    // Check if group_id exists
    const hasGroupId = await checkColumn('scorecard_metrics', 'group_id');
    
    // Build query based on available columns
    let selectColumns = 'sm.id, sm.name, sm.goal, sm.owner, sm.type, sm.created_at, sm.updated_at, sm.team_id, t.name as team_name';
    if (hasValueType) {
      selectColumns += ', sm.value_type';
    }
    if (hasComparisonOperator) {
      selectColumns += ', sm.comparison_operator';
    }
    // Always include description - the column should exist from migration 028
    selectColumns += ', sm.description';
    if (hasGroupId) {
      selectColumns += ', sm.group_id, sm.display_order';
    }
    
    // Filter by specific team ID from request
    const teamFilter = teamId ? 'AND sm.team_id = $2' : '';
    
    // Get all metrics for the team
    const metricsQuery = `
      SELECT ${selectColumns}
      FROM scorecard_metrics sm
      LEFT JOIN teams t ON sm.team_id = t.id
      WHERE sm.organization_id = $1 ${teamFilter}
      ORDER BY sm.display_order ASC, sm.created_at ASC
    `;
    const queryParams = teamId ? [orgId, teamId] : [orgId];
    const metrics = await db.query(metricsQuery, queryParams);
    
    // Get all scores for these metrics
    const scoresQuery = `
      SELECT ss.metric_id, ss.week_date, ss.value, sm.type
      FROM scorecard_scores ss
      JOIN scorecard_metrics sm ON ss.metric_id = sm.id
      WHERE ss.metric_id IN (
        SELECT id FROM scorecard_metrics sm
        WHERE sm.organization_id = $1 ${teamFilter}
      )
    `;
    const scores = await db.query(scoresQuery, queryParams);
    
    // Organize scores by metric and week/month
    const weeklyScores = {};
    const monthlyScores = {};
    
    scores.rows.forEach(score => {
      // Format date as YYYY-MM-DD
      const scoreDate = new Date(score.week_date).toISOString().split('T')[0];
      
      // Use object format only when notes actually have content
      // Empty string or null notes should just send the value
      const hasNotes = score.notes && score.notes.trim().length > 0;
      const scoreData = hasNotes ? {
        value: score.value,
        notes: score.notes
      } : score.value;
      
      // Determine if this is a monthly score based on metric type
      if (score.type === 'monthly') {
        if (!monthlyScores[score.metric_id]) {
          monthlyScores[score.metric_id] = {};
        }
        monthlyScores[score.metric_id][scoreDate] = scoreData;
      } else {
        if (!weeklyScores[score.metric_id]) {
          weeklyScores[score.metric_id] = {};
        }
        weeklyScores[score.metric_id][scoreDate] = scoreData;
      }
    });
    
    // Get team members for the organization
    const teamMembers = await getTeamMembers(orgId);
    
    res.json({
      success: true,
      data: {
        metrics: metrics.rows.map(metric => ({
          ...metric,
          teamName: metric.team_name
        })),
        weeklyScores,
        monthlyScores,
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
    const { name, goal, owner, type = 'weekly', valueType = 'number', comparisonOperator = 'greater_equal', description, groupId } = req.body;
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    const hasDescription = await checkColumn('scorecard_metrics', 'description');
    const hasGroupId = await checkColumn('scorecard_metrics', 'group_id');
    
    // Get the max display_order for this org/team
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM scorecard_metrics WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;
    
    // Build insert query based on available columns
    let columns = ['organization_id', 'team_id', 'name', 'goal', 'owner', 'type', 'display_order'];
    let values = [orgId, teamId, name, goal, owner, type, nextOrder];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
    
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
    // Always include description
    if (description !== undefined) {
      columns.push('description');
      values.push(description);
      placeholders.push(`$${values.length}`);
    }
    if (hasGroupId && groupId !== undefined) {
      columns.push('group_id');
      values.push(groupId);
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
    const { name, goal, owner, type, valueType, comparisonOperator, description, groupId } = req.body;
    console.log('Updating metric with data:', { name, goal, owner, type, valueType, comparisonOperator, description, groupId });
    
    // Check if new columns exist
    const hasValueType = await checkColumn('scorecard_metrics', 'value_type');
    const hasComparisonOperator = await checkColumn('scorecard_metrics', 'comparison_operator');
    const hasDescription = await checkColumn('scorecard_metrics', 'description');
    const hasGroupId = await checkColumn('scorecard_metrics', 'group_id');
    
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
    // Always include description
    if (description !== undefined) {
      values.push(description);
      setClauses.push(`description = $${values.length}`);
    }
    if (hasGroupId && groupId !== undefined) {
      values.push(groupId);
      setClauses.push(`group_id = $${values.length}`);
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
    
    console.log('Updated metric result:', result.rows[0]);
    console.log('Updated metric description from DB:', result.rows[0].description);
    
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

// Update a weekly or monthly score
export const updateScore = async (req, res) => {
  try {
    const { metricId, week, value, notes, scoreType = 'weekly' } = req.body;
    
    // Convert week/month to proper date format
    const scoreDate = new Date(week).toISOString().split('T')[0];
    
    // Upsert the score with notes
    const query = `
      INSERT INTO scorecard_scores (metric_id, week_date, value, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (metric_id, week_date)
      DO UPDATE SET value = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING metric_id, week_date, value, notes
    `;
    
    const result = await db.query(query, [metricId, scoreDate, value || null, notes || null]);
    
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

// Get historical data for a specific metric
export const getMetricHistory = async (req, res) => {
  try {
    const { metricId } = req.params;
    
    // Get all historical scores for the metric with publishing info
    const result = await db.query(
      `SELECT 
        ss.week_date,
        ss.value,
        ss.created_at,
        ss.updated_at,
        t.name as team_name
       FROM scorecard_scores ss
       JOIN scorecard_metrics sm ON ss.metric_id = sm.id
       LEFT JOIN teams t ON sm.team_id = t.id
       WHERE ss.metric_id = $1
       ORDER BY ss.week_date DESC`,
      [metricId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching metric history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch metric history'
    });
  }
};

// Check for duplicate scorecards in an organization
export const checkDuplicateScorecard = async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Get all unique team IDs for this organization's scorecard metrics
    const teamResult = await db.query(
      `SELECT 
        COUNT(DISTINCT sm.team_id) as unique_team_count,
        COUNT(*) as total_metrics,
        STRING_AGG(DISTINCT sm.team_id::text, ', ' ORDER BY sm.team_id) as team_ids,
        o.name as org_name
       FROM scorecard_metrics sm
       JOIN organizations o ON sm.organization_id = o.id
       WHERE sm.organization_id = $1
       GROUP BY o.id, o.name`,
      [orgId]
    );
    
    // Get metrics grouped by team_id
    const metricsResult = await db.query(
      `SELECT 
        sm.team_id,
        COUNT(*) as metric_count,
        STRING_AGG(sm.name, ', ' ORDER BY sm.name) as metric_names,
        MIN(sm.created_at) as earliest_created,
        MAX(sm.created_at) as latest_created
       FROM scorecard_metrics sm
       WHERE sm.organization_id = $1
       GROUP BY sm.team_id
       ORDER BY sm.team_id`,
      [orgId]
    );
    
    // Get recent scores by team_id to see if data differs
    const scoresResult = await db.query(
      `SELECT 
        sm.team_id,
        COUNT(DISTINCT ss.week_date) as weeks_with_data,
        COUNT(*) as total_scores,
        MAX(ss.week_date) as latest_score_date
       FROM scorecard_metrics sm
       LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
       WHERE sm.organization_id = $1
       GROUP BY sm.team_id`,
      [orgId]
    );
    
    const summary = teamResult.rows[0] || {};
    const hasDuplicates = summary.unique_team_count > 1;
    
    res.json({
      success: true,
      data: {
        summary: {
          organizationName: summary.org_name,
          hasDuplicateScorecard: hasDuplicates,
          uniqueTeamCount: summary.unique_team_count || 0,
          totalMetrics: summary.total_metrics || 0,
          teamIds: summary.team_ids ? summary.team_ids.split(', ') : []
        },
        metricsByTeam: metricsResult.rows,
        scoresByTeam: scoresResult.rows,
        recommendation: hasDuplicates 
          ? 'Multiple team IDs found! This organization has metrics split across different team IDs.' 
          : 'No duplicates found. All metrics use the same team ID.'
      }
    });
  } catch (error) {
    console.error('Error checking duplicate scorecards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check duplicate scorecards'
    });
  }
};

// Diagnostic endpoint to find scorecard data for an organization
export const findScorecardData = async (req, res) => {
  try {
    const { orgName } = req.query;
    
    if (!orgName) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }
    
    // Find all scorecard metrics for organizations matching the name
    const result = await db.query(
      `SELECT 
        sm.*,
        o.name as org_name,
        o.id as org_id,
        u.first_name || ' ' || u.last_name as owner_name
       FROM scorecard_metrics sm
       JOIN organizations o ON sm.organization_id = o.id
       LEFT JOIN users u ON sm.owner_id = u.id
       WHERE o.name ILIKE $1
       ORDER BY sm.created_at DESC`,
      [`%${orgName}%`]
    );
    
    // Also get weekly scores for these metrics
    const metricIds = result.rows.map(m => m.id);
    let scores = [];
    
    if (metricIds.length > 0) {
      const scoresResult = await db.query(
        `SELECT * FROM scorecard_scores 
         WHERE metric_id = ANY($1)
         ORDER BY week_date DESC`,
        [metricIds]
      );
      scores = scoresResult.rows;
    }
    
    res.json({
      success: true,
      data: {
        metrics: result.rows,
        scores: scores,
        summary: {
          totalMetrics: result.rows.length,
          totalScores: scores.length,
          organizations: [...new Set(result.rows.map(m => ({ id: m.org_id, name: m.org_name })))],
          teamIds: [...new Set(result.rows.map(m => m.team_id))]
        }
      }
    });
  } catch (error) {
    console.error('Error finding scorecard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find scorecard data'
    });
  }
};

// Update metric order
export const updateMetricOrder = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { metrics } = req.body; // Array of { id, display_order }
    
    console.log('Updating metric order:', { orgId, teamId, metricsCount: metrics?.length });
    
    if (!metrics || !Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        message: 'Metrics array is required'
      });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // Update each metric's display_order
      for (const metric of metrics) {
        await db.query(
          'UPDATE scorecard_metrics SET display_order = $1 WHERE id = $2 AND organization_id = $3',
          [metric.display_order, metric.id, orgId]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Metric order updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating metric order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update metric order'
    });
  }
};