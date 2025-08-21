import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { 
  generateDailyActiveUsersReport, 
  sendDailyActiveUsersEmail,
  processDailyActiveUsersReport 
} from '../services/dailyActiveUsersService.js';

const router = express.Router();

/**
 * @route   GET /api/v1/daily-active-users/report
 * @desc    Generate daily active users report for a specific date
 * @access  Admin only
 */
router.get('/report', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { date } = req.query;
    let reportDate = null;
    
    if (date) {
      reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
    }
    
    const report = await generateDailyActiveUsersReport(reportDate);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * @route   POST /api/v1/daily-active-users/send
 * @desc    Manually trigger sending of daily active users report
 * @access  Admin only
 */
router.post('/send', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const result = await processDailyActiveUsersReport();
    
    res.json({
      success: true,
      message: 'Daily active users report sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send report'
    });
  }
});

/**
 * @route   POST /api/v1/daily-active-users/test-email
 * @desc    Send a test email to the current user
 * @access  Admin only
 */
router.post('/test-email', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { date } = req.body;
    let reportDate = null;
    
    if (date) {
      reportDate = new Date(date);
      if (isNaN(reportDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }
    }
    
    // Get user's email
    const userResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userEmail = userResult.rows[0].email;
    
    // Generate and send report
    const report = await generateDailyActiveUsersReport(reportDate);
    await sendDailyActiveUsersEmail(userEmail, report);
    
    res.json({
      success: true,
      message: `Test report sent to ${userEmail}`,
      data: {
        reportDate: report.reportDate,
        summary: report.summary
      }
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email'
    });
  }
});

/**
 * @route   GET /api/v1/daily-active-users/subscription
 * @desc    Check if current user is subscribed to daily reports
 * @access  Private
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT receive_daily_login_reports FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        subscribed: result.rows[0].receive_daily_login_reports || false
      }
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check subscription status'
    });
  }
});

/**
 * @route   PUT /api/v1/daily-active-users/subscription
 * @desc    Update daily report subscription for current user
 * @access  Admin only
 */
router.put('/subscription', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const { subscribed } = req.body;
    
    if (typeof subscribed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Subscribed must be a boolean value'
      });
    }
    
    await query(
      'UPDATE users SET receive_daily_login_reports = $1, updated_at = NOW() WHERE id = $2',
      [subscribed, req.user.id]
    );
    
    res.json({
      success: true,
      message: subscribed 
        ? 'Successfully subscribed to daily active users reports' 
        : 'Successfully unsubscribed from daily active users reports',
      data: { subscribed }
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription'
    });
  }
});

/**
 * @route   GET /api/v1/daily-active-users/recipients
 * @desc    Get list of all users subscribed to daily reports
 * @access  Admin only
 */
router.get('/recipients', authenticate, authorize(['admin', 'owner']), async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        u.role,
        o.name as organization_name
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      WHERE u.receive_daily_login_reports = TRUE
      ORDER BY o.name, u.email`
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipients'
    });
  }
});

export default router;