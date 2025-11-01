import db from '../config/database.js';

// Get planning goals for a team and year
export const getPlanningGoals = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;
    const { year } = req.query;

    // Default to next year if not specified
    const planningYear = year ? parseInt(year) : new Date().getFullYear() + 1;

    const result = await db.query(
      `SELECT 
        id,
        organization_id,
        team_id,
        planning_year,
        goals,
        status,
        created_by,
        created_at,
        updated_at
      FROM annual_planning_goals
      WHERE organization_id = $1 
        AND team_id = $2 
        AND planning_year = $3
        AND deleted_at IS NULL`,
      [organizationId, teamId, planningYear]
    );

    if (result.rows.length === 0) {
      // Return empty goals structure if none exist yet
      return res.json({
        organization_id: organizationId,
        team_id: teamId,
        planning_year: planningYear,
        goals: [],
        status: 'draft'
      });
    }

    // Return goals directly (JSONB is already a JavaScript object)
    const planningGoals = result.rows[0];

    res.json(planningGoals);
  } catch (error) {
    console.error('Error fetching planning goals:', error);
    res.status(500).json({ error: 'Failed to fetch planning goals' });
  }
};

// Save/update planning goals
export const savePlanningGoals = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;
    const { year, goals } = req.body;
    const userId = req.user.id;

    const planningYear = year || new Date().getFullYear() + 1;

    // Validate goals array
    if (!Array.isArray(goals)) {
      return res.status(400).json({ error: 'Goals must be an array' });
    }

    // Upsert: Insert or update if exists
    const result = await db.query(
      `INSERT INTO annual_planning_goals 
        (organization_id, team_id, planning_year, goals, status, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5)
       ON CONFLICT (organization_id, team_id, planning_year)
       DO UPDATE SET
         goals = $4,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [organizationId, teamId, planningYear, JSON.stringify(goals), userId]
    );

    // Return saved goals directly (JSONB is already a JavaScript object)
    const savedGoals = result.rows[0];

    res.json(savedGoals);
  } catch (error) {
    console.error('Error saving planning goals:', error);
    res.status(500).json({ error: 'Failed to save planning goals' });
  }
};

// Publish planning goals to VTO (for January migration)
export const publishToVTO = async (req, res) => {
  try {
    const { organizationId, teamId } = req.params;
    const { year } = req.body;

    const planningYear = year || new Date().getFullYear();

    // This is a placeholder for future implementation
    // In January, this will:
    // 1. Archive current VTO goals
    // 2. Copy planning goals to VTO
    // 3. Mark planning goals as 'archived'

    // For now, just mark as approved
    const result = await db.query(
      `UPDATE annual_planning_goals
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1 
         AND team_id = $2 
         AND planning_year = $3
         AND deleted_at IS NULL
       RETURNING *`,
      [organizationId, teamId, planningYear]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planning goals not found' });
    }

    // Return approved goals directly (JSONB is already a JavaScript object)
    const approvedGoals = result.rows[0];

    res.json({
      message: 'Planning goals approved. VTO migration will be implemented in January.',
      data: approvedGoals
    });
  } catch (error) {
    console.error('Error publishing planning goals:', error);
    res.status(500).json({ error: 'Failed to publish planning goals' });
  }
};