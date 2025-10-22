import db from '../config/database.js';
import logger from '../utils/logger.js';

export const getActiveMeetings = async (req, res) => {
  try {
    logger.debug('Fetching active meetings for admin dashboard');
    
    // Use a safer query that doesn't assume all table relationships exist
    const result = await db.query(`
      SELECT 
        m.id,
        m.status,
        m.started_at,
        m.organization_id,
        COALESCE(o.name, 'Unknown Organization') as organization_name,
        COALESCE(t.name, 'Unknown Team') as team_name,
        false as has_active_recording
      FROM meetings m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN teams t ON m.team_id = t.id
      WHERE m.status = 'in-progress'
      ORDER BY m.started_at DESC
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
      timestamp: new Date().toISOString()
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