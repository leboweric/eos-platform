import db from '../config/database.js';
import logger from '../utils/logger.js';

export const getActiveMeetings = async (req, res) => {
  try {
    logger.debug('Fetching active meeting sessions for admin dashboard');
    
    // Debug query - check recent meeting_sessions
    const debugResult = await db.query(`
      SELECT 
        ms.id,
        ms.is_active,
        ms.start_time,
        ms.team_id,
        ms.organization_id,
        ms.meeting_type,
        COALESCE(o.name, 'Unknown Organization') as organization_name,
        COALESCE(t.name, 'Unknown Team') as team_name
      FROM meeting_sessions ms
      LEFT JOIN organizations o ON ms.organization_id = o.id
      LEFT JOIN teams t ON ms.team_id = t.id
      WHERE ms.start_time > NOW() - INTERVAL '1 hour'
      ORDER BY ms.start_time DESC
      LIMIT 10
    `);
    
    // Debug logging removed to reduce log noise
    
    // CORRECTED: Query meeting_sessions table (not meetings table!)
    const result = await db.query(`
      SELECT 
        ms.id,
        ms.is_active as status,
        ms.start_time as started_at,
        ms.organization_id,
        ms.team_id,
        ms.meeting_type,
        COALESCE(o.name, 'Unknown Organization') as organization_name,
        COALESCE(t.name, 'Unknown Team') as team_name,
        false as has_active_recording,
        false as possibly_incorrect_status,
        calculate_active_duration(ms.id) as duration_seconds
      FROM meeting_sessions ms
      LEFT JOIN organizations o ON ms.organization_id = o.id
      LEFT JOIN teams t ON ms.team_id = t.id
      WHERE ms.is_active = true
        AND ms.expires_at > NOW()
      ORDER BY ms.start_time DESC
    `);

    const activeMeetings = result.rows;
    
    // Check for active AI transcription sessions
    const transcriptionResult = await db.query(`
      SELECT COUNT(*) as active_count
      FROM meeting_transcripts 
      WHERE status = 'processing' 
        AND deleted_at IS NULL
    `);
    
    const activeRecordings = parseInt(transcriptionResult.rows[0]?.active_count || 0);
    
    // Reduced logging - only log when meetings are active
    if (activeMeetings.length > 0) {
      logger.info(`Admin dashboard: ${activeMeetings.length} active meeting sessions`);
    }

    res.json({
      success: true,
      meetings: activeMeetings,
      count: activeMeetings.length,
      activeRecordingsCount: activeRecordings,
      safeToDeploy: activeMeetings.length === 0 && activeRecordings === 0,
      timestamp: new Date().toISOString(),
      debug: {
        recentSessionsLastHour: debugResult.rows,
        queryTable: 'meeting_sessions',
        activeFilter: 'is_active = true AND expires_at > NOW()'
      }
    });
  } catch (error) {
    logger.error('Error fetching active meeting sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active meeting sessions',
      details: error.message
    });
  }
};