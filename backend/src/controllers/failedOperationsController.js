import failedOperationsService from '../services/failedOperationsService.js';

/**
 * Get list of failed operations with filters
 */
export const getFailedOperations = async (req, res) => {
  try {
    const {
      organization_id,
      operation_type,
      severity,
      resolved,
      limit = 50,
      offset = 0,
      start_date,
      end_date
    } = req.query;

    // Convert resolved string to boolean
    const resolvedBool = resolved === 'true' ? true : resolved === 'false' ? false : undefined;

    const failures = await failedOperationsService.getFailures({
      organizationId: organization_id,
      operationType: operation_type,
      severity,
      resolved: resolvedBool,
      limit: parseInt(limit),
      offset: parseInt(offset),
      startDate: start_date,
      endDate: end_date
    });

    res.json({
      success: true,
      data: failures,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: failures.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching failed operations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch operations',
      message: error.message
    });
  }
};

/**
 * Get failure statistics
 */
export const getFailureStatistics = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const [stats, countsByType, criticalFailures] = await Promise.all([
      failedOperationsService.getStatistics(parseInt(hours)),
      failedOperationsService.getFailureCountsByType(parseInt(hours)),
      failedOperationsService.getCriticalFailures()
    ]);

    res.json({
      success: true,
      data: {
        statistics: stats,
        byType: countsByType,
        critical: criticalFailures,
        hours: parseInt(hours)
      }
    });
  } catch (error) {
    console.error('Error fetching failure statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

/**
 * Mark a failure as resolved
 */
export const resolveFailure = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const resolved = await failedOperationsService.resolveFailure(id, userId);
    
    if (!resolved) {
      return res.status(404).json({
        success: false,
        error: 'Failed operation not found'
      });
    }

    res.json({
      success: true,
      data: resolved
    });
  } catch (error) {
    console.error('Error resolving failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve operation',
      message: error.message
    });
  }
};

/**
 * Bulk resolve failures
 */
export const bulkResolveFailures = async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: ids must be a non-empty array'
      });
    }

    const resolved = await failedOperationsService.bulkResolveFailures(ids, userId);

    res.json({
      success: true,
      data: {
        resolvedCount: resolved.length,
        resolvedIds: resolved.map(r => r.id)
      }
    });
  } catch (error) {
    console.error('Error bulk resolving failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk resolve operations',
      message: error.message
    });
  }
};

/**
 * Get critical unresolved failures
 */
export const getCriticalFailures = async (req, res) => {
  try {
    const criticalFailures = await failedOperationsService.getCriticalFailures();

    res.json({
      success: true,
      data: criticalFailures
    });
  } catch (error) {
    console.error('Error fetching critical failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch critical failures',
      message: error.message
    });
  }
};

/**
 * Get recent failures from cache (for real-time monitoring)
 */
export const getRecentFailures = async (req, res) => {
  try {
    const { count = 10 } = req.query;
    const recentFailures = failedOperationsService.getRecentFromCache(parseInt(count));

    res.json({
      success: true,
      data: recentFailures
    });
  } catch (error) {
    console.error('Error fetching recent failures:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent failures',
      message: error.message
    });
  }
};

/**
 * Get daily summary of failures
 */
export const getDailySummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const [dailySummary, failuresByDay] = await Promise.all([
      failedOperationsService.getDailySummary(parseInt(days)),
      failedOperationsService.getFailuresByDay(parseInt(days))
    ]);

    res.json({
      success: true,
      data: {
        dailySummary,
        failuresByDay,
        days: parseInt(days)
      }
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily summary',
      message: error.message
    });
  }
};

export default {
  getFailedOperations,
  getFailureStatistics,
  resolveFailure,
  bulkResolveFailures,
  getCriticalFailures,
  getRecentFailures,
  getDailySummary
};