import db from '../config/database.js';
import logger from '../utils/logger.js';

export const getActiveMeetings = async (req, res) => {
  try {
    logger.debug('Fetching active meetings for admin dashboard');
    
    const result = await db.query(`
      SELECT 
        m.id,
        m.status,
        m.started_at,
        m.organization_id,
        o.name as organization_name,
        t.id as team_id,
        t.name as team_name,
        false as has_active_recording
      FROM meetings m
      LEFT JOIN organizations o ON m.organization_id = o.id
      LEFT JOIN teams t ON m.team_id = t.id
      WHERE m.status = 'in-progress'
      ORDER BY m.started_at DESC
    `);

    const activeMeetings = result.rows;
    const activeRecordings = activeMeetings.filter(m => m.has_active_recording).length;

    logger.info(`Admin dashboard: ${activeMeetings.length} active meetings, ${activeRecordings} with recordings`);

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
      error: 'Failed to fetch active meetings'
    });
  }
};