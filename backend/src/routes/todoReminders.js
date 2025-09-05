import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendTodoReminders, recordMeetingConclusion } from '../services/todoReminderService.js';
import { getLeadershipTeamId } from '../utils/teamUtils.js';

const router = express.Router();

// Manual trigger for todo reminders (admin only)
router.post('/trigger', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    console.log('Manually triggering todo reminders...');
    const result = await sendTodoReminders();
    
    res.json({
      success: true,
      message: `Todo reminders sent to ${result.sent} teams`,
      details: result.teams
    });
  } catch (error) {
    console.error('Failed to trigger todo reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send todo reminders',
      error: error.message
    });
  }
});

// Test endpoint to record a meeting conclusion for testing reminders
router.post('/test-record', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { daysAgo = 6 } = req.body;
    const organizationId = req.user.organization_id || req.user.organizationId;
    const teamId = req.body.teamId || await getLeadershipTeamId(organizationId);
    
    // Create a test meeting conclusion X days ago
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - daysAgo);
    
    // Use raw SQL to insert with a specific date
    const db = (await import('../config/database.js')).default;
    await db.query(
      `INSERT INTO meeting_conclusions (organization_id, team_id, meeting_type, concluded_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, team_id, meeting_type, concluded_at) DO NOTHING`,
      [organizationId, teamId, 'weekly', testDate]
    );
    
    res.json({
      success: true,
      message: `Test meeting conclusion recorded for ${daysAgo} days ago`,
      details: {
        organizationId,
        teamId,
        date: testDate
      }
    });
  } catch (error) {
    console.error('Failed to record test meeting conclusion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record test meeting conclusion',
      error: error.message
    });
  }
});

export default router;