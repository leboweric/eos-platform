import db from '../config/database.js';

// @desc    Get all teams for an organization
// @route   GET /api/v1/organizations/:orgId/teams
// @access  Private
export const getTeams = async (req, res) => {
  const { orgId } = req.params;

  try {
    const query = `
      SELECT 
        t.id,
        t.organization_id,
        t.department_id,
        t.name,
        t.description,
        t.created_at,
        t.updated_at,
        t.is_leadership_team,
        d.name as department_name,
        COUNT(DISTINCT tm.user_id) as member_count
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      LEFT JOIN team_members tm ON tm.team_id = t.id
      WHERE t.organization_id = $1
      GROUP BY t.id, d.id
      ORDER BY t.is_leadership_team DESC, t.name
    `;

    const result = await db.query(query, [orgId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get single team
// @route   GET /api/v1/organizations/:orgId/teams/:teamId
// @access  Private
export const getTeam = async (req, res) => {
  const { orgId, teamId } = req.params;

  try {
    const query = `
      SELECT 
        t.id,
        t.organization_id,
        t.department_id,
        t.name,
        t.description,
        t.created_at,
        t.updated_at,
        t.is_leadership_team,
        d.name as department_name
      FROM teams t
      LEFT JOIN departments d ON t.department_id = d.id
      WHERE t.id = $1 AND t.organization_id = $2
    `;

    const result = await db.query(query, [teamId, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Get team members
    const membersQuery = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        tm.role
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = $1
      ORDER BY u.first_name, u.last_name
    `;

    const membersResult = await db.query(membersQuery, [teamId]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        members: membersResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Create new team
// @route   POST /api/v1/organizations/:orgId/teams
// @access  Private
export const createTeam = async (req, res) => {
  const { orgId } = req.params;
  const { name, description, department_id, is_leadership_team } = req.body;

  try {
    const query = `
      INSERT INTO teams (organization_id, name, description, department_id, is_leadership_team)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    // Automatically set is_leadership_team to true if name contains "Leadership Team"
    const isLeadershipTeam = is_leadership_team || 
      (name && (name === 'Leadership Team' || name.toLowerCase().includes('leadership team')));
    
    const result = await db.query(query, [
      orgId,
      name,
      description,
      department_id,
      isLeadershipTeam
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Update team
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId
// @access  Private
export const updateTeam = async (req, res) => {
  const { orgId, teamId } = req.params;
  const { name, description, department_id, is_leadership_team } = req.body;

  try {
    const query = `
      UPDATE teams
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        department_id = COALESCE($3, department_id),
        is_leadership_team = COALESCE($4, is_leadership_team),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND organization_id = $6
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      description,
      department_id,
      is_leadership_team,
      teamId,
      orgId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Delete team
// @route   DELETE /api/v1/organizations/:orgId/teams/:teamId
// @access  Private
export const deleteTeam = async (req, res) => {
  const { orgId, teamId } = req.params;

  try {
    // Check if team has any related data
    const checkQuery = `
      SELECT 
        (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = $1) as priorities_count,
        (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = $1) as metrics_count,
        (SELECT COUNT(*) FROM issues WHERE team_id = $1) as issues_count,
        (SELECT COUNT(*) FROM todos WHERE team_id = $1) as todos_count
    `;

    const checkResult = await db.query(checkQuery, [teamId]);
    const counts = checkResult.rows[0];

    if (Object.values(counts).some(count => parseInt(count) > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete team with existing data'
      });
    }

    const query = `
      DELETE FROM teams
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [teamId, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Check if user is on a leadership team
// @route   GET /api/v1/organizations/:orgId/teams/check-leadership/:userId
// @access  Private
export const checkUserLeadershipTeam = async (req, res) => {
  const { orgId, userId } = req.params;

  try {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1
          AND t.organization_id = $2
          AND t.is_leadership_team = true
      ) as is_on_leadership_team
    `;

    const result = await db.query(query, [userId, orgId]);

    res.json({
      success: true,
      data: {
        is_on_leadership_team: result.rows[0].is_on_leadership_team
      }
    });
  } catch (error) {
    console.error('Error checking leadership team membership:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Utility function to check if a user is on a leadership team
export const isUserOnLeadershipTeam = async (userId, organizationId) => {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM team_members tm
        JOIN teams t ON tm.team_id = t.id
        WHERE tm.user_id = $1
          AND t.organization_id = $2
          AND t.is_leadership_team = true
      ) as is_on_leadership_team
    `;

    const result = await db.query(query, [userId, organizationId]);
    return result.rows[0].is_on_leadership_team;
  } catch (error) {
    console.error('Error checking leadership team membership:', error);
    return false;
  }
};

// Utility function to check if a team is a leadership team
export const isLeadershipTeam = async (teamId) => {
  try {
    const query = `
      SELECT is_leadership_team
      FROM teams
      WHERE id = $1
    `;

    const result = await db.query(query, [teamId]);
    return result.rows.length > 0 && result.rows[0].is_leadership_team;
  } catch (error) {
    console.error('Error checking if team is leadership team:', error);
    return false;
  }
};