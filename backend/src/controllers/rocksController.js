import db from '../config/database.js';
import logger from '../utils/logger.js';

// Get all rocks with optional department filter
const getRocks = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { departmentId, teamId, status, quarter, year } = req.query;

    let query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.owner_id,
        r.team_id,
        r.department_id,
        r.due_date,
        r.status,
        r.completion_percentage,
        r.quarter,
        r.year,
        r.is_company_rock,
        r.created_at,
        r.updated_at,
        u.first_name || ' ' || u.last_name as owner_name,
        t.name as team_name,
        d.name as department_name
      FROM rocks r
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN teams t ON t.id = r.team_id
      LEFT JOIN departments d ON d.id = r.department_id
      WHERE r.organization_id = $1`;

    const params = [organizationId];
    let paramCount = 1;

    // Add filters
    if (departmentId) {
      paramCount++;
      query += ` AND r.department_id = $${paramCount}`;
      params.push(departmentId);
    }

    if (teamId) {
      paramCount++;
      query += ` AND r.team_id = $${paramCount}`;
      params.push(teamId);
    }

    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }

    if (quarter) {
      paramCount++;
      query += ` AND r.quarter = $${paramCount}`;
      params.push(quarter);
    }

    if (year) {
      paramCount++;
      query += ` AND r.year = $${paramCount}`;
      params.push(year);
    }

    query += ` ORDER BY r.is_company_rock DESC, r.created_at DESC`;

    const { rows } = await db.query(query, params);

    res.json(rows);
  } catch (error) {
    logger.error('Error fetching rocks:', error);
    res.status(500).json({ error: 'Failed to fetch rocks' });
  }
};

// Get single rock
const getRock = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const query = `
      SELECT 
        r.*,
        u.first_name || ' ' || u.last_name as owner_name,
        t.name as team_name,
        d.name as department_name,
        (
          SELECT json_agg(
            json_build_object(
              'id', m.id,
              'milestone', m.milestone,
              'due_date', m.due_date,
              'is_completed', m.is_completed,
              'completed_at', m.completed_at
            ) ORDER BY m.due_date
          )
          FROM rock_milestones m
          WHERE m.rock_id = r.id
        ) as milestones
      FROM rocks r
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN teams t ON t.id = r.team_id
      LEFT JOIN departments d ON d.id = r.department_id
      WHERE r.id = $1 AND r.organization_id = $2`;

    const { rows } = await db.query(query, [id, organizationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error fetching rock:', error);
    res.status(500).json({ error: 'Failed to fetch rock' });
  }
};

// Create new rock
const createRock = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { organizationId } = req.user;
    const { 
      name, 
      description, 
      ownerId, 
      teamId, 
      departmentId,
      dueDate, 
      quarter, 
      year, 
      isCompanyRock,
      milestones 
    } = req.body;

    // Validate required fields
    if (!name || !ownerId || !quarter || !year) {
      return res.status(400).json({ 
        error: 'Name, owner, quarter, and year are required' 
      });
    }

    // Verify owner belongs to organization
    const ownerCheck = await client.query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [ownerId, organizationId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid owner' });
    }

    // Create rock
    const rockQuery = `
      INSERT INTO rocks (
        name, description, organization_id, owner_id, team_id, department_id,
        due_date, quarter, year, is_company_rock, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'on_track')
      RETURNING *`;

    const rockValues = [
      name, 
      description, 
      organizationId, 
      ownerId, 
      teamId || null, 
      departmentId || null,
      dueDate, 
      quarter, 
      year, 
      isCompanyRock || false
    ];

    const { rows: [rock] } = await client.query(rockQuery, rockValues);

    // Add milestones if provided
    if (milestones && milestones.length > 0) {
      for (const milestone of milestones) {
        await client.query(
          `INSERT INTO rock_milestones (rock_id, milestone, due_date)
           VALUES ($1, $2, $3)`,
          [rock.id, milestone.milestone, milestone.dueDate]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete rock with relationships
    const completeRock = await getRockWithDetails(rock.id, organizationId);
    
    res.status(201).json(completeRock);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating rock:', error);
    res.status(500).json({ error: 'Failed to create rock' });
  } finally {
    client.release();
  }
};

// Update rock
const updateRock = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { organizationId } = req.user;
    const { 
      name, 
      description, 
      ownerId, 
      teamId, 
      departmentId,
      dueDate, 
      status,
      completionPercentage,
      milestones 
    } = req.body;

    // Check rock exists and belongs to org
    const existingCheck = await client.query(
      'SELECT id FROM rocks WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    // Update rock
    const updateQuery = `
      UPDATE rocks 
      SET name = $1, description = $2, owner_id = $3, team_id = $4, 
          department_id = $5, due_date = $6, status = $7, 
          completion_percentage = $8, updated_at = NOW()
      WHERE id = $9 AND organization_id = $10
      RETURNING *`;

    const values = [
      name, 
      description, 
      ownerId, 
      teamId || null, 
      departmentId || null,
      dueDate, 
      status, 
      completionPercentage || 0,
      id, 
      organizationId
    ];

    await client.query(updateQuery, values);

    // Update milestones if provided
    if (milestones !== undefined) {
      // Delete existing milestones
      await client.query('DELETE FROM rock_milestones WHERE rock_id = $1', [id]);
      
      // Add new milestones
      for (const milestone of milestones) {
        await client.query(
          `INSERT INTO rock_milestones (rock_id, milestone, due_date, is_completed, completed_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, milestone.milestone, milestone.dueDate, milestone.isCompleted || false, milestone.completedAt || null]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated rock
    const rock = await getRockWithDetails(id, organizationId);
    res.json(rock);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating rock:', error);
    res.status(500).json({ error: 'Failed to update rock' });
  } finally {
    client.release();
  }
};

// Delete rock
const deleteRock = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { organizationId } = req.user;

    // Delete milestones first
    await client.query('DELETE FROM rock_milestones WHERE rock_id = $1', [id]);

    // Delete rock
    const result = await client.query(
      'DELETE FROM rocks WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Rock deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting rock:', error);
    res.status(500).json({ error: 'Failed to delete rock' });
  } finally {
    client.release();
  }
};

// Update rock status
const updateRockStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { status, completionPercentage } = req.body;

    const query = `
      UPDATE rocks 
      SET status = $1, completion_percentage = $2, updated_at = NOW()
      WHERE id = $3 AND organization_id = $4
      RETURNING *`;

    const { rows } = await db.query(query, [
      status, 
      completionPercentage || 0, 
      id, 
      organizationId
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rock not found' });
    }

    const rock = await getRockWithDetails(id, organizationId);
    res.json(rock);
  } catch (error) {
    logger.error('Error updating rock status:', error);
    res.status(500).json({ error: 'Failed to update rock status' });
  }
};

// Helper function to get rock with details
const getRockWithDetails = async (rockId, organizationId) => {
  const query = `
    SELECT 
      r.*,
      u.first_name || ' ' || u.last_name as owner_name,
      t.name as team_name,
      d.name as department_name,
      (
        SELECT json_agg(
          json_build_object(
            'id', m.id,
            'milestone', m.milestone,
            'due_date', m.due_date,
            'is_completed', m.is_completed,
            'completed_at', m.completed_at
          ) ORDER BY m.due_date
        )
        FROM rock_milestones m
        WHERE m.rock_id = r.id
      ) as milestones
    FROM rocks r
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN teams t ON t.id = r.team_id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE r.id = $1 AND r.organization_id = $2`;

  const { rows } = await db.query(query, [rockId, organizationId]);
  return rows[0];
};

export {
  getRocks,
  getRock,
  createRock,
  updateRock,
  deleteRock,
  updateRockStatus
};