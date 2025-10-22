import { getClient } from '../config/database.js';

/**
 * Transcription Cleanup Utilities
 * 
 * Handles cleanup of stuck, abandoned, or crashed transcription sessions
 * Prevents database bloat and ensures consistent state
 */

/**
 * Clean up transcription sessions that are stuck in 'processing' state
 * @param {number} minutesThreshold - Sessions older than this are considered stuck
 * @returns {Object} Cleanup results
 */
export const cleanupStuckSessions = async (minutesThreshold = 10) => {
  const client = await getClient();
  
  try {
    console.log(`🧹 [Cleanup] Looking for sessions stuck longer than ${minutesThreshold} minutes...`);
    
    // Find stuck sessions
    const stuckQuery = await client.query(`
      SELECT id, meeting_id, processing_started_at
      FROM meeting_transcripts
      WHERE status = 'processing'
      AND processing_started_at < NOW() - INTERVAL '${minutesThreshold} minutes'
      AND deleted_at IS NULL
    `);
    
    const stuckSessions = stuckQuery.rows;
    console.log(`🔍 [Cleanup] Found ${stuckSessions.length} stuck session(s)`);
    
    if (stuckSessions.length === 0) {
      return {
        cleaned: 0,
        sessions: [],
        message: 'No stuck sessions found'
      };
    }
    
    // Update stuck sessions to failed status
    const cleanupResult = await client.query(`
      UPDATE meeting_transcripts
      SET 
        status = 'failed',
        error_message = 'Session automatically terminated due to timeout after ${minutesThreshold} minutes',
        processing_completed_at = NOW(),
        updated_at = NOW()
      WHERE status = 'processing'
      AND processing_started_at < NOW() - INTERVAL '${minutesThreshold} minutes'
      AND deleted_at IS NULL
      RETURNING id, meeting_id
    `);
    
    const cleanedSessions = cleanupResult.rows;
    
    console.log(`✅ [Cleanup] Successfully cleaned up ${cleanedSessions.length} stuck session(s)`);
    
    return {
      cleaned: cleanedSessions.length,
      sessions: cleanedSessions,
      message: `Cleaned up ${cleanedSessions.length} stuck transcription session(s)`
    };
    
  } finally {
    client.release();
  }
};

/**
 * Force cleanup ALL processing sessions (nuclear option)
 * Use with caution - this will terminate all active transcriptions
 * @returns {Object} Cleanup results
 */
export const forceCleanupAllSessions = async () => {
  const client = await getClient();
  
  try {
    console.log('🚨 [Cleanup] FORCE CLEANUP: Terminating ALL processing sessions...');
    
    // Get all processing sessions first
    const activeQuery = await client.query(`
      SELECT id, meeting_id, processing_started_at
      FROM meeting_transcripts
      WHERE status = 'processing'
      AND deleted_at IS NULL
    `);
    
    const activeSessions = activeQuery.rows;
    console.log(`🔍 [Cleanup] Found ${activeSessions.length} active session(s) to terminate`);
    
    if (activeSessions.length === 0) {
      return {
        cleaned: 0,
        sessions: [],
        message: 'No active sessions to clean up'
      };
    }
    
    // Force terminate all active sessions
    const cleanupResult = await client.query(`
      UPDATE meeting_transcripts
      SET 
        status = 'failed',
        error_message = 'Session forcefully terminated via admin cleanup',
        processing_completed_at = NOW(),
        updated_at = NOW()
      WHERE status = 'processing'
      AND deleted_at IS NULL
      RETURNING id, meeting_id
    `);
    
    const cleanedSessions = cleanupResult.rows;
    
    console.log(`⚠️ [Cleanup] FORCE CLEANUP: Terminated ${cleanedSessions.length} active session(s)`);
    
    return {
      cleaned: cleanedSessions.length,
      sessions: cleanedSessions,
      message: `Force terminated ${cleanedSessions.length} active transcription session(s)`,
      warning: 'All active transcriptions were forcefully terminated'
    };
    
  } finally {
    client.release();
  }
};

/**
 * Get statistics about current transcription sessions
 * @returns {Object} Session statistics
 */
export const getSessionStats = async () => {
  const client = await getClient();
  
  try {
    const statsQuery = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(processing_started_at) as oldest_started,
        MAX(processing_started_at) as newest_started
      FROM meeting_transcripts
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY status
    `);
    
    const stats = statsQuery.rows.reduce((acc, row) => {
      acc[row.status] = {
        count: parseInt(row.count),
        oldest_started: row.oldest_started,
        newest_started: row.newest_started
      };
      return acc;
    }, {});
    
    // Get total count
    const totalQuery = await client.query(`
      SELECT COUNT(*) as total
      FROM meeting_transcripts
      WHERE deleted_at IS NULL
    `);
    
    return {
      total: parseInt(totalQuery.rows[0].total),
      by_status: stats,
      timestamp: new Date().toISOString()
    };
    
  } finally {
    client.release();
  }
};

/**
 * Clean up old completed/failed sessions (data retention)
 * @param {number} daysOld - Delete sessions older than this many days
 * @returns {Object} Cleanup results
 */
export const cleanupOldSessions = async (daysOld = 30) => {
  const client = await getClient();
  
  try {
    console.log(`🗑️ [Cleanup] Removing transcription sessions older than ${daysOld} days...`);
    
    // Soft delete old sessions (set deleted_at instead of actual DELETE)
    const cleanupResult = await client.query(`
      UPDATE meeting_transcripts
      SET 
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE (status = 'completed' OR status = 'failed')
      AND processing_completed_at < NOW() - INTERVAL '${daysOld} days'
      AND deleted_at IS NULL
      RETURNING id, meeting_id, status
    `);
    
    const removedSessions = cleanupResult.rows;
    
    console.log(`🗑️ [Cleanup] Soft-deleted ${removedSessions.length} old session(s)`);
    
    return {
      removed: removedSessions.length,
      sessions: removedSessions,
      message: `Removed ${removedSessions.length} sessions older than ${daysOld} days`
    };
    
  } finally {
    client.release();
  }
};

// Default export for convenience
export default {
  cleanupStuckSessions,
  forceCleanupAllSessions,
  getSessionStats,
  cleanupOldSessions
};