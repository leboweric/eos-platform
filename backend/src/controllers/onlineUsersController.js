import db from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Get list of currently online users
 * A user is considered online if they have an active session with activity in the last 5 minutes
 */
export const getOnlineUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.email,
        u.role,
        o.name as organization_name,
        us.last_activity_at,
        us.created_at as session_started_at,
        EXTRACT(EPOCH FROM (NOW() - us.created_at))/60 as session_duration_minutes,
        us.ip_address,
        us.user_agent
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      JOIN organizations o ON us.organization_id = o.id
      WHERE us.is_active = true
        AND us.expires_at > NOW()
        AND us.last_activity_at > NOW() - INTERVAL '5 minutes'
      ORDER BY us.last_activity_at DESC
    `);

    const onlineUsers = result.rows;

    // Only log when there are active users to reduce noise
    if (onlineUsers.length > 0) {
      logger.info(`Online users: ${onlineUsers.length} active`);
    }

    res.json({
      success: true,
      users: onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching online users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch online users',
      details: error.message
    });
  }
};

/**
 * Update session heartbeat
 * Called by frontend every 60 seconds to keep session alive
 */
export const updateHeartbeat = async (req, res) => {
  try {
    const { sessionToken } = req.body;
    const userId = req.user?.id;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: 'Session token is required'
      });
    }

    // Update last_activity_at (trigger will auto-extend expires_at)
    const result = await db.query(`
      UPDATE user_sessions
      SET last_activity_at = NOW()
      WHERE session_token = $1
        AND user_id = $2
        AND is_active = true
        AND expires_at > NOW()
      RETURNING id, expires_at
    `,
    [sessionToken, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or expired'
      });
    }

    res.json({
      success: true,
      session: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update heartbeat',
      details: error.message
    });
  }
};

/**
 * Create a new user session on login
 */
export const createSession = async (userId, organizationId, sessionToken, ipAddress, userAgent) => {
  try {
    const result = await db.query(`
      INSERT INTO user_sessions (
        user_id,
        organization_id,
        session_token,
        ip_address,
        user_agent,
        last_activity_at,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '24 hours')
      RETURNING id, expires_at
    `,
    [userId, organizationId, sessionToken, ipAddress, userAgent]);

    logger.info(`Created session for user ${userId}: ${result.rows[0].id}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating user session:', error);
    throw error;
  }
};

/**
 * Deactivate session on logout
 */
export const deactivateSession = async (sessionToken) => {
  try {
    const result = await db.query(`
      UPDATE user_sessions
      SET is_active = false
      WHERE session_token = $1
      RETURNING id
    `,
    [sessionToken]);

    if (result.rows.length > 0) {
      logger.info(`Deactivated session: ${result.rows[0].id}`);
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error deactivating session:', error);
    throw error;
  }
};

/**
 * Cleanup expired sessions (run periodically)
 */
export const cleanupExpiredSessions = async (req, res) => {
  try {
    const result = await db.query(`SELECT cleanup_expired_sessions() as affected_rows`);
    const affectedRows = result.rows[0].affected_rows;

    logger.info(`Cleaned up ${affectedRows} expired sessions`);

    res.json({
      success: true,
      affected_rows: affectedRows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error cleaning up expired sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired sessions',
      details: error.message
    });
  }
};
