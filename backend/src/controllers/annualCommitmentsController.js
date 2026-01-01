import db from '../config/database.js';

// Get all commitments for a team/year
export const getTeamCommitments = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { year } = req.query;
    
    const currentYear = year || new Date().getFullYear() + 1; // Default to next year
    
    const result = await db.query(
      `SELECT 
        ac.*,
        u.first_name,
        u.last_name,
        u.email
      FROM annual_commitments ac
      JOIN users u ON ac.user_id = u.id
      WHERE ac.organization_id = $1 
        AND ac.team_id = $2 
        AND ac.year = $3
      ORDER BY u.first_name, u.last_name`,
      [orgId, teamId, currentYear]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching annual commitments:', error);
    res.status(500).json({ error: 'Failed to fetch commitments' });
  }
};

// Create or update commitment
export const upsertCommitment = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { userId, year, commitmentText } = req.body;
    const createdBy = req.user.id;
    
    const result = await db.query(
      `INSERT INTO annual_commitments 
        (organization_id, team_id, user_id, year, commitment_text, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, team_id, user_id, year)
      DO UPDATE SET 
        commitment_text = EXCLUDED.commitment_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [orgId, teamId, userId, year, commitmentText, createdBy]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving annual commitment:', error);
    res.status(500).json({ error: 'Failed to save commitment' });
  }
};

// Delete commitment
export const deleteCommitment = async (req, res) => {
  try {
    const { orgId, teamId, id } = req.params;
    
    await db.query(
      `DELETE FROM annual_commitments 
      WHERE id = $1 AND organization_id = $2 AND team_id = $3`,
      [id, orgId, teamId]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting annual commitment:', error);
    res.status(500).json({ error: 'Failed to delete commitment' });
  }
};

// Get all commitments for an organization (filtered by team)
export const getOrganizationCommitments = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { teamId } = req.query;
    
    console.log('[AnnualCommitments API] Request params:', { orgId, teamId, query: req.query });
    
    let query = `SELECT 
        ac.id,
        ac.organization_id,
        ac.team_id,
        ac.user_id,
        ac.year,
        ac.commitment_text,
        ac.created_at,
        ac.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        t.name as team_name,
        t.color as team_color
      FROM annual_commitments ac
      JOIN users u ON ac.user_id = u.id
      LEFT JOIN teams t ON ac.team_id = t.id
      WHERE ac.organization_id = $1 
        AND ac.commitment_text IS NOT NULL
        AND ac.commitment_text != ''`;
    
    const params = [orgId];
    
    // Filter by team if teamId is provided
    if (teamId) {
      query += ` AND ac.team_id = $2`;
      params.push(teamId);
    }
    
    query += ` ORDER BY ac.year DESC, t.name, u.first_name, u.last_name`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organization commitments:', error);
    res.status(500).json({ error: 'Failed to fetch commitments' });
  }
};

// Get user's current commitment for dashboard
export const getUserCurrentCommitment = async (req, res) => {
  try {
    const { organizationId, userId } = req.params;
    
    // Get current planning year (next calendar year)
    const currentYear = new Date().getFullYear() + 1;
    
    const result = await db.query(
      `SELECT 
        ac.id,
        ac.organization_id,
        ac.team_id,
        ac.user_id,
        ac.year,
        ac.commitment_text,
        ac.created_at,
        ac.updated_at,
        t.name as team_name,
        t.color as team_color
      FROM annual_commitments ac
      LEFT JOIN teams t ON ac.team_id = t.id
      WHERE ac.organization_id = $1 
        AND ac.user_id = $2 
        AND ac.year = $3
        AND ac.commitment_text IS NOT NULL
        AND ac.commitment_text != ''
      ORDER BY ac.created_at DESC
      LIMIT 1`,
      [organizationId, userId, currentYear]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No commitment found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user current commitment:', error);
    res.status(500).json({ error: 'Failed to fetch commitment' });
  }
};