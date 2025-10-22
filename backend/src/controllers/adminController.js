import db from '../config/database.js';
import logger from '../utils/logger.js';

export const getActiveMeetings = async (req, res) => {
  try {
    logger.debug('Fetching active meetings for admin dashboard');
    
    // Debug query - let's see ALL recent meetings to understand the data
    const debugResult = await db.query(`
      SELECT 
        m.id,
        m.status,
        m.created_at,
        m.team_id,
        m.organization_id,
        COALESCE(o.name, 'Unknown Organization') as organization_name,
        COALESCE(t.name, 'Unknown Team') as team_name
      FROM meetings m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN teams t ON m.team_id = t.id
      WHERE m.created_at > NOW() - INTERVAL '1 hour'
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    
    logger.info('🔍 Recent meetings (last hour):', debugResult.rows);
    
    // Main query - look for active meetings (try multiple status values)
    const result = await db.query(`
      SELECT 
        m.id,
        m.status,
        m.created_at as started_at,
        m.organization_id,
        m.team_id,
        COALESCE(o.name, 'Unknown Organization') as organization_name,
        COALESCE(t.name, 'Unknown Team') as team_name,
        false as has_active_recording
      FROM meetings m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN teams t ON m.team_id = t.id
      WHERE m.status IN ('in-progress', 'active', 'started', 'ongoing')
      ORDER BY m.created_at DESC
    `);

    const activeMeetings = result.rows;
    const activeRecordings = 0; // No active recordings for now
    
    logger.info(`Admin dashboard: ${activeMeetings.length} active meetings found`);

    res.json({
      success: true,
      meetings: activeMeetings,
      count: activeMeetings.length,
      activeRecordingsCount: activeRecordings,
      safeToDeploy: activeMeetings.length === 0,
      timestamp: new Date().toISOString(),
      debug: {
        recentMeetingsLastHour: debugResult.rows,
        statusFilter: ['in-progress', 'active', 'started', 'ongoing']
      }
    });
  } catch (error) {
    logger.error('Error fetching active meetings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active meetings',
      details: error.message
    });
  }
};