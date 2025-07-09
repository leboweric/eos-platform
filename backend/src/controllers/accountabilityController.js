import db from '../config/database.js';
import logger from '../utils/logger.js';

// Get all seats for an organization
const getSeats = async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get all seats with their relationships
    const query = `
      SELECT 
        s.id,
        s.seat_name,
        s.seat_description,
        s.parent_seat_id,
        s.is_leadership_team,
        s.created_at,
        s.updated_at,
        sa.user_id as assigned_user_id,
        u.first_name || ' ' || u.last_name as assigned_user_name,
        COALESCE(
          (
            SELECT json_agg(sr.responsibility ORDER BY sr.created_at)
            FROM seat_responsibilities sr
            WHERE sr.seat_id = s.id
          ),
          '[]'::json
        ) as responsibilities
      FROM accountability_seats s
      LEFT JOIN seat_assignments sa ON sa.seat_id = s.id AND sa.is_active = true
      LEFT JOIN users u ON u.id = sa.user_id
      WHERE s.organization_id = $1
      ORDER BY s.parent_seat_id NULLS FIRST, s.seat_name`;

    const { rows: seats } = await db.query(query, [organizationId]);

    // Build hierarchical structure
    const seatMap = {};
    const rootSeats = [];

    seats.forEach(seat => {
      seatMap[seat.id] = {
        ...seat,
        assignedUser: seat.assigned_user_id ? {
          id: seat.assigned_user_id,
          name: seat.assigned_user_name
        } : null,
        subSeats: []
      };
    });

    seats.forEach(seat => {
      if (seat.parent_seat_id) {
        const parent = seatMap[seat.parent_seat_id];
        if (parent) {
          parent.subSeats.push(seatMap[seat.id]);
        }
      } else {
        rootSeats.push(seatMap[seat.id]);
      }
    });

    res.json(rootSeats);
  } catch (error) {
    logger.error('Error fetching seats:', error);
    res.status(500).json({ error: 'Failed to fetch accountability chart' });
  }
};

// Get single seat with details
const getSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const query = `
      SELECT 
        s.*,
        sa.user_id as assigned_user_id,
        u.first_name || ' ' || u.last_name as assigned_user_name,
        COALESCE(
          (
            SELECT json_agg(sr.responsibility ORDER BY sr.created_at)
            FROM seat_responsibilities sr
            WHERE sr.seat_id = s.id
          ),
          '[]'::json
        ) as responsibilities
      FROM accountability_seats s
      LEFT JOIN seat_assignments sa ON sa.seat_id = s.id AND sa.is_active = true
      LEFT JOIN users u ON u.id = sa.user_id
      WHERE s.id = $1 AND s.organization_id = $2`;

    const { rows } = await db.query(query, [id, organizationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    const seat = rows[0];
    seat.assignedUser = seat.assigned_user_id ? {
      id: seat.assigned_user_id,
      name: seat.assigned_user_name
    } : null;

    res.json(seat);
  } catch (error) {
    logger.error('Error fetching seat:', error);
    res.status(500).json({ error: 'Failed to fetch seat' });
  }
};

// Create new seat
const createSeat = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { organizationId } = req.user;
    const { seatName, seatDescription, parentSeatId, isLeadershipTeam } = req.body;

    // Validate required fields
    if (!seatName) {
      return res.status(400).json({ error: 'Seat name is required' });
    }

    // Verify parent seat belongs to same org if provided
    if (parentSeatId) {
      const parentCheck = await client.query(
        'SELECT id FROM accountability_seats WHERE id = $1 AND organization_id = $2',
        [parentSeatId, organizationId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent seat' });
      }
    }

    // Create seat
    const seatQuery = `
      INSERT INTO accountability_seats (seat_name, seat_description, organization_id, parent_seat_id, is_leadership_team)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`;

    const values = [seatName, seatDescription, organizationId, parentSeatId || null, isLeadershipTeam || false];
    const { rows } = await client.query(seatQuery, values);

    await client.query('COMMIT');

    // Fetch with full details
    const seat = await getSeatWithDetails(rows[0].id, organizationId);
    
    res.status(201).json(seat);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating seat:', error);
    res.status(500).json({ error: 'Failed to create seat' });
  } finally {
    client.release();
  }
};

// Update seat
const updateSeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { seatName, seatDescription, parentSeatId, isLeadershipTeam } = req.body;

    // Check seat exists and belongs to org
    const existingCheck = await db.query(
      'SELECT id FROM accountability_seats WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    // Prevent circular hierarchy
    if (parentSeatId === id) {
      return res.status(400).json({ error: 'Seat cannot be its own parent' });
    }

    // Verify parent seat if provided
    if (parentSeatId) {
      const parentCheck = await db.query(
        'SELECT id FROM accountability_seats WHERE id = $1 AND organization_id = $2',
        [parentSeatId, organizationId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent seat' });
      }
    }

    // Update seat
    const query = `
      UPDATE accountability_seats 
      SET seat_name = $1, seat_description = $2, parent_seat_id = $3, is_leadership_team = $4, updated_at = NOW()
      WHERE id = $5 AND organization_id = $6
      RETURNING *`;

    const values = [seatName, seatDescription, parentSeatId || null, isLeadershipTeam || false, id, organizationId];
    await db.query(query, values);

    // Fetch with full details
    const seat = await getSeatWithDetails(id, organizationId);
    
    res.json(seat);
  } catch (error) {
    logger.error('Error updating seat:', error);
    res.status(500).json({ error: 'Failed to update seat' });
  }
};

// Delete seat
const deleteSeat = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { organizationId } = req.user;

    // Check if seat has sub-seats
    const subSeatCheck = await client.query(
      'SELECT COUNT(*) FROM accountability_seats WHERE parent_seat_id = $1',
      [id]
    );
    if (parseInt(subSeatCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete seat with sub-seats' });
    }

    // Delete related data
    await client.query('DELETE FROM seat_responsibilities WHERE seat_id = $1', [id]);
    await client.query('DELETE FROM seat_assignments WHERE seat_id = $1', [id]);

    // Delete seat
    const result = await client.query(
      'DELETE FROM accountability_seats WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Seat deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deleting seat:', error);
    res.status(500).json({ error: 'Failed to delete seat' });
  } finally {
    client.release();
  }
};

// Update seat responsibilities
const updateResponsibilities = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { organizationId } = req.user;
    const { responsibilities } = req.body;

    // Validate
    if (!Array.isArray(responsibilities)) {
      return res.status(400).json({ error: 'Responsibilities must be an array' });
    }

    if (responsibilities.length < 3 || responsibilities.length > 7) {
      return res.status(400).json({ error: 'Seats must have between 3 and 7 responsibilities' });
    }

    // Check seat exists and belongs to org
    const existingCheck = await client.query(
      'SELECT id FROM accountability_seats WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    // Delete existing responsibilities
    await client.query('DELETE FROM seat_responsibilities WHERE seat_id = $1', [id]);

    // Insert new responsibilities
    for (const responsibility of responsibilities) {
      await client.query(
        'INSERT INTO seat_responsibilities (seat_id, responsibility) VALUES ($1, $2)',
        [id, responsibility]
      );
    }

    await client.query('COMMIT');

    // Fetch updated seat
    const seat = await getSeatWithDetails(id, organizationId);
    res.json(seat);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating responsibilities:', error);
    res.status(500).json({ error: 'Failed to update responsibilities' });
  } finally {
    client.release();
  }
};

// Assign user to seat
const assignUser = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { organizationId } = req.user;
    const { userId } = req.body;

    // Check seat exists and belongs to org
    const existingCheck = await client.query(
      'SELECT id FROM accountability_seats WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found' });
    }

    // Verify user belongs to organization
    if (userId) {
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [userId, organizationId]
      );
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid user' });
      }
    }

    // Deactivate existing assignment
    await client.query(
      'UPDATE seat_assignments SET is_active = false WHERE seat_id = $1',
      [id]
    );

    // Create new assignment if userId provided
    if (userId) {
      await client.query(
        'INSERT INTO seat_assignments (seat_id, user_id, assigned_by) VALUES ($1, $2, $3)',
        [id, userId, req.user.userId]
      );
    }

    await client.query('COMMIT');

    // Fetch updated seat
    const seat = await getSeatWithDetails(id, organizationId);
    res.json(seat);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error assigning user:', error);
    res.status(500).json({ error: 'Failed to assign user' });
  } finally {
    client.release();
  }
};

// Helper function to get seat with full details
const getSeatWithDetails = async (seatId, organizationId) => {
  const query = `
    SELECT 
      s.*,
      sa.user_id as assigned_user_id,
      u.first_name || ' ' || u.last_name as assigned_user_name,
      COALESCE(
        (
          SELECT json_agg(sr.responsibility ORDER BY sr.created_at)
          FROM seat_responsibilities sr
          WHERE sr.seat_id = s.id
        ),
        '[]'::json
      ) as responsibilities
    FROM accountability_seats s
    LEFT JOIN seat_assignments sa ON sa.seat_id = s.id AND sa.is_active = true
    LEFT JOIN users u ON u.id = sa.user_id
    WHERE s.id = $1 AND s.organization_id = $2`;

  const { rows } = await db.query(query, [seatId, organizationId]);
  const seat = rows[0];
  
  if (seat) {
    seat.assignedUser = seat.assigned_user_id ? {
      id: seat.assigned_user_id,
      name: seat.assigned_user_name
    } : null;
  }
  
  return seat;
};

export {
  getSeats,
  getSeat,
  createSeat,
  updateSeat,
  deleteSeat,
  updateResponsibilities,
  assignUser
};