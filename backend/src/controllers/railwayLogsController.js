/**
 * Railway Logs Controller
 * Handles API endpoints for fetching Railway logs
 */

import railwayService from '../services/railwayService.js';

/**
 * Get environment logs
 * GET /api/v1/admin/railway-logs
 */
async function getLogs(req, res) {
  try {
    const { limit = 100, filter, severity, beforeDate, afterDate } = req.query;

    const logs = await railwayService.getEnvironmentLogs({
      limit: parseInt(limit, 10),
      filter,
      severity,
      beforeDate,
      afterDate,
    });

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error fetching Railway logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Railway logs',
    });
  }
}

/**
 * Get logs summary by day
 * GET /api/v1/admin/railway-logs/summary
 */
async function getLogsSummary(req, res) {
  try {
    const { days = 7 } = req.query;

    const summary = await railwayService.getLogsSummaryByDay(parseInt(days, 10));

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error fetching Railway logs summary:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Railway logs summary',
    });
  }
}

/**
 * Get recent errors
 * GET /api/v1/admin/railway-logs/errors
 */
async function getRecentErrors(req, res) {
  try {
    const { limit = 50 } = req.query;

    const errors = await railwayService.getRecentErrors(parseInt(limit, 10));

    res.json({
      success: true,
      count: errors.length,
      errors,
    });
  } catch (error) {
    console.error('Error fetching Railway errors:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Railway errors',
    });
  }
}

/**
 * Search logs
 * GET /api/v1/admin/railway-logs/search
 */
async function searchLogs(req, res) {
  try {
    const { q, limit = 100 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required',
      });
    }

    const logs = await railwayService.searchLogs(q, parseInt(limit, 10));

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Error searching Railway logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search Railway logs',
    });
  }
}

export default {
  getLogs,
  getLogsSummary,
  getRecentErrors,
  searchLogs,
};
