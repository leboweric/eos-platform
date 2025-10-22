import db from '../config/database.js';
import logger from '../utils/logger.js';

export const getActiveMeetings = async (req, res) => {
  try {
    logger.debug('Fetching active meetings for admin dashboard');
    
    // Start with a simple query to test if meetings table exists
    const result = await db.query(`
      SELECT COUNT(*) as meeting_count FROM meetings WHERE status = 'in-progress'
    `);

    const count = parseInt(result.rows[0].meeting_count) || 0;
    
    logger.info(`Admin dashboard: ${count} active meetings found`);

    // Return simplified response for now
    res.json({
      success: true,
      meetings: [],
      count: count,
      activeRecordingsCount: 0,
      safeToDeploy: count === 0,
      timestamp: new Date().toISOString(),
      message: count === 0 ? 'No active meetings' : `${count} active meetings detected`
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