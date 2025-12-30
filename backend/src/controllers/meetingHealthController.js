/**
 * Meeting Health Controller
 * 
 * Provides API endpoints for the meeting health dashboard
 */

import { getRecentErrors, getErrorStats, acknowledgeError } from '../services/meetingAlertService.js';
import db from '../config/database.js';

/**
 * Get meeting health overview
 */
export const getMeetingHealth = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    
    // Get error statistics
    const errorStats = await getErrorStats(hours);
    
    // Get active meetings count
    const activeMeetingsResult = await db.query(`
      SELECT 
        COUNT(*) as active_count,
        COUNT(DISTINCT organization_id) as orgs_with_meetings
      FROM meeting_sessions 
      WHERE is_active = TRUE
    `);
    
    // Get recent meeting activity
    const recentActivityResult = await db.query(`
      SELECT 
        COUNT(*) as meetings_last_24h,
        COUNT(*) FILTER (WHERE is_active = FALSE) as completed_meetings,
        AVG(EXTRACT(EPOCH FROM (updated_at - start_time))/60) FILTER (WHERE is_active = FALSE) as avg_duration_minutes
      FROM meeting_sessions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    // Determine overall health status
    const criticalErrors = parseInt(errorStats.summary.critical_count) || 0;
    const totalErrors = parseInt(errorStats.summary.total_errors) || 0;
    
    let healthStatus = 'healthy';
    if (criticalErrors > 0) {
      healthStatus = 'critical';
    } else if (totalErrors > 5) {
      healthStatus = 'degraded';
    }
    
    res.json({
      success: true,
      data: {
        status: healthStatus,
        timestamp: new Date().toISOString(),
        period: `${hours} hours`,
        
        activeMeetings: {
          count: parseInt(activeMeetingsResult.rows[0].active_count) || 0,
          organizationsWithMeetings: parseInt(activeMeetingsResult.rows[0].orgs_with_meetings) || 0
        },
        
        recentActivity: {
          meetingsLast24h: parseInt(recentActivityResult.rows[0].meetings_last_24h) || 0,
          completedMeetings: parseInt(recentActivityResult.rows[0].completed_meetings) || 0,
          avgDurationMinutes: Math.round(parseFloat(recentActivityResult.rows[0].avg_duration_minutes) || 0)
        },
        
        errors: {
          total: totalErrors,
          critical: criticalErrors,
          unacknowledged: parseInt(errorStats.summary.unacknowledged_count) || 0,
          orgsAffected: parseInt(errorStats.summary.orgs_affected) || 0,
          byType: errorStats.byType
        }
      }
    });
  } catch (error) {
    console.error('Error getting meeting health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get meeting health',
      message: error.message
    });
  }
};

/**
 * Get recent meeting errors
 */
export const getRecentMeetingErrors = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const limit = parseInt(req.query.limit) || 50;
    const unacknowledgedOnly = req.query.unacknowledged === 'true';
    const organizationId = req.query.organization_id || null;
    
    const errors = await getRecentErrors({
      organizationId,
      hours,
      limit,
      unacknowledgedOnly
    });
    
    res.json({
      success: true,
      data: errors
    });
  } catch (error) {
    console.error('Error getting recent meeting errors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get meeting errors',
      message: error.message
    });
  }
};

/**
 * Acknowledge a meeting error
 */
export const acknowledgeMeetingError = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    
    const error = await acknowledgeError(id, userId, notes);
    
    if (!error) {
      return res.status(404).json({
        success: false,
        error: 'Error not found'
      });
    }
    
    res.json({
      success: true,
      data: error
    });
  } catch (error) {
    console.error('Error acknowledging meeting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge error',
      message: error.message
    });
  }
};

/**
 * Get stuck/orphaned meeting sessions
 */
export const getStuckSessions = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        ms.*,
        o.name as organization_name,
        t.name as team_name,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name,
        EXTRACT(EPOCH FROM (NOW() - ms.start_time))/3600 as hours_active
      FROM meeting_sessions ms
      LEFT JOIN organizations o ON ms.organization_id = o.id
      LEFT JOIN teams t ON ms.team_id = t.id
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.is_active = TRUE
        AND ms.start_time < NOW() - INTERVAL '4 hours'
      ORDER BY ms.start_time ASC
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting stuck sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stuck sessions',
      message: error.message
    });
  }
};

/**
 * Force end a stuck meeting session (admin only)
 */
export const forceEndSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    
    // Get session details first
    const sessionResult = await db.query(
      'SELECT * FROM meeting_sessions WHERE id = $1',
      [id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const session = sessionResult.rows[0];
    
    // Force end the session
    await db.query(
      `UPDATE meeting_sessions 
       SET is_active = FALSE, 
           updated_at = NOW(),
           notes = COALESCE(notes, '') || E'\n[Force ended by admin: ' || $2 || ']'
       WHERE id = $1`,
      [id, reason || 'No reason provided']
    );
    
    // Log this as an admin action
    await db.query(
      `INSERT INTO meeting_errors (
        organization_id, session_id, user_id,
        error_type, severity, error_message, context
      ) VALUES ($1, $2, $3, 'session_orphaned', 'warning', $4, $5)`,
      [
        session.organization_id,
        id,
        userId,
        `Session force-ended by admin after ${Math.round((Date.now() - new Date(session.start_time).getTime()) / 3600000)} hours`,
        JSON.stringify({ reason, adminUserId: userId })
      ]
    );
    
    res.json({
      success: true,
      message: 'Session force-ended successfully'
    });
  } catch (error) {
    console.error('Error force-ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force-end session',
      message: error.message
    });
  }
};

// Cleanup all stuck meetings (manual trigger)
export const cleanupAllStuckMeetings = async (req, res) => {
  try {
    const { cleanupStuckMeetings } = await import('../jobs/meetingCleanupCron.js');
    const result = await cleanupStuckMeetings();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.cleaned} stuck meetings`,
      ...result
    });
  } catch (error) {
    console.error('Error cleaning up stuck meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup stuck meetings',
      message: error.message
    });
  }
};

export default {
  getMeetingHealth,
  getRecentMeetingErrors,
  acknowledgeMeetingError,
  getStuckSessions,
  forceEndSession,
  cleanupAllStuckMeetings
};
