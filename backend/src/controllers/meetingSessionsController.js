import pool from '../config/database.js';

// Start a new meeting session
export const startSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { organization_id, team_id, meeting_type } = req.body;
    const user_id = req.user.id;

    // Check if there's already an active session for this team
    const existingSession = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds
      FROM meeting_sessions ms
      WHERE ms.team_id = $1 
        AND ms.meeting_type = $2 
        AND ms.is_active = true
      ORDER BY ms.created_at DESC
      LIMIT 1
    `, [team_id, meeting_type]);

    if (existingSession.rows.length > 0) {
      // Return existing session with full details
      return res.json({
        session: existingSession.rows[0],
        message: 'Resuming existing session',
        resumed: true
      });
    }

    // Create new session
    const result = await client.query(`
      INSERT INTO meeting_sessions (
        organization_id,
        team_id,
        meeting_type,
        facilitator_id,
        start_time,
        is_active,
        is_paused,
        total_paused_duration
      ) VALUES ($1, $2, $3, $4, NOW(), true, false, 0)
      RETURNING *
    `, [organization_id, team_id, meeting_type, user_id]);

    res.status(201).json({
      session: result.rows[0],
      message: 'Meeting session started',
      resumed: false
    });
  } catch (error) {
    console.error('Error starting meeting session:', error);
    res.status(500).json({ error: 'Failed to start meeting session' });
  } finally {
    client.release();
  }
};

// Pause a meeting session
export const pauseSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // Update session to paused state
    const sessionResult = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_paused = true,
        last_pause_time = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND is_active = true AND is_paused = false
      RETURNING *
    `, [id]);

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active session not found or already paused' });
    }

    // Create pause event
    await client.query(`
      INSERT INTO meeting_pause_events (
        session_id,
        pause_time,
        paused_by,
        reason
      ) VALUES ($1, NOW(), $2, $3)
    `, [id, user_id, reason || null]);

    await client.query('COMMIT');

    res.json({
      session: sessionResult.rows[0],
      message: 'Meeting paused'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error pausing meeting session:', error);
    res.status(500).json({ error: 'Failed to pause meeting session' });
  } finally {
    client.release();
  }
};

// Resume a meeting session
export const resumeSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // Get current session state
    const currentSession = await client.query(`
      SELECT * FROM meeting_sessions
      WHERE id = $1 AND is_active = true AND is_paused = true
    `, [id]);

    if (currentSession.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Paused session not found' });
    }

    const session = currentSession.rows[0];
    
    // Calculate pause duration
    const pauseDuration = Math.floor(
      (Date.now() - new Date(session.last_pause_time).getTime()) / 1000
    );

    // Update session to resumed state
    const sessionResult = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_paused = false,
        last_resume_time = NOW(),
        total_paused_duration = total_paused_duration + $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *, calculate_active_duration(id) as active_duration_seconds
    `, [pauseDuration, id]);

    // Update the pause event with resume info
    await client.query(`
      UPDATE meeting_pause_events
      SET 
        resume_time = NOW(),
        resumed_by = $1,
        duration_seconds = $2
      WHERE id = (
        SELECT id 
        FROM meeting_pause_events 
        WHERE session_id = $3
          AND resume_time IS NULL
        ORDER BY pause_time DESC
        LIMIT 1
      )
    `, [user_id, pauseDuration, id]);

    await client.query('COMMIT');

    res.json({
      session: sessionResult.rows[0],
      message: 'Meeting resumed'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resuming meeting session:', error);
    res.status(500).json({ error: 'Failed to resume meeting session' });
  } finally {
    client.release();
  }
};

// Get current session status
export const getSessionStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name,
        (
          SELECT COUNT(*) 
          FROM meeting_pause_events 
          WHERE session_id = ms.id
        ) as pause_count
      FROM meeting_sessions ms
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get pause history
    const pauseHistory = await client.query(`
      SELECT 
        mpe.*,
        CONCAT(pu.first_name, ' ', pu.last_name) as paused_by_name,
        CONCAT(ru.first_name, ' ', ru.last_name) as resumed_by_name
      FROM meeting_pause_events mpe
      LEFT JOIN users pu ON mpe.paused_by = pu.id
      LEFT JOIN users ru ON mpe.resumed_by = ru.id
      WHERE mpe.session_id = $1
      ORDER BY mpe.pause_time DESC
    `, [id]);

    res.json({
      session: result.rows[0],
      pauseHistory: pauseHistory.rows
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  } finally {
    client.release();
  }
};

// Update session section
export const updateSessionSection = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { section } = req.body;

    const result = await client.query(`
      UPDATE meeting_sessions
      SET 
        current_section = $1,
        current_section_start = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING *
    `, [section, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json({
      session: result.rows[0],
      message: `Section changed to ${section}`
    });
  } catch (error) {
    console.error('Error updating session section:', error);
    res.status(500).json({ error: 'Failed to update session section' });
  } finally {
    client.release();
  }
};

// End a meeting session
export const endSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Calculate final duration before ending
    const durationResult = await client.query(`
      SELECT calculate_active_duration($1) as final_duration_seconds
    `, [id]);

    const result = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        ...result.rows[0],
        final_duration_seconds: durationResult.rows[0].final_duration_seconds
      },
      message: 'Meeting session ended'
    });
  } catch (error) {
    console.error('Error ending meeting session:', error);
    res.status(500).json({ error: 'Failed to end meeting session' });
  } finally {
    client.release();
  }
};

// Get active session for a team
export const getActiveSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { team_id, meeting_type } = req.query;

    const result = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name
      FROM meeting_sessions ms
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.team_id = $1 
        AND ms.meeting_type = $2 
        AND ms.is_active = true
      ORDER BY ms.created_at DESC
      LIMIT 1
    `, [team_id, meeting_type]);

    if (result.rows.length === 0) {
      return res.json({ session: null });
    }

    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  } finally {
    client.release();
  }
};

// Auto-save timer state (called periodically from frontend)
export const saveTimerState = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { elapsed_seconds } = req.body;

    // Just update the updated_at to keep session alive
    const result = await client.query(`
      UPDATE meeting_sessions
      SET updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving timer state:', error);
    res.status(500).json({ error: 'Failed to save timer state' });
  } finally {
    client.release();
  }
};