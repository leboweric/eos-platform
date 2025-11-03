import ActivityTrackingService from '../services/activityTrackingService.js';

const activityService = ActivityTrackingService.getInstance();

// Get user activity statistics
export async function getActivityStats(req, res) {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const days = parseInt(req.query.days) || 7;

    const [activeUsers, avgDuration, featureUsage, timeline] = await Promise.all([
      activityService.getActiveUsers(organizationId),
      activityService.getAverageSessionDuration(organizationId, days),
      activityService.getFeatureUsage(organizationId, days),
      activityService.getActivityTimeline(organizationId, days)
    ]);

    res.json({
      success: true,
      data: {
        activeUsers,
        avgSessionDuration: avgDuration,
        featureUsage,
        timeline,
        days
      }
    });
  } catch (error) {
    console.error('[UserActivity] Error getting activity stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch activity statistics',
      message: error.message 
    });
  }
}

// Get top active users
export async function getTopActiveUsers(req, res) {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;

    const topUsers = await activityService.getTopUsers(organizationId, limit, days);

    res.json({
      success: true,
      data: topUsers,
      params: { limit, days }
    });
  } catch (error) {
    console.error('[UserActivity] Error getting top users:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch top users',
      message: error.message 
    });
  }
}

// Get recent activity
export async function getRecentActivity(req, res) {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const limit = parseInt(req.query.limit) || 20;

    const recentActivity = await activityService.getRecentActivity(organizationId, limit);

    res.json({
      success: true,
      data: recentActivity
    });
  } catch (error) {
    console.error('[UserActivity] Error getting recent activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch recent activity',
      message: error.message 
    });
  }
}

// Get user-specific activity
export async function getUserActivity(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const activity = await activityService.getUserActivity(userId, limit);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('[UserActivity] Error getting user activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch user activity',
      message: error.message 
    });
  }
}

// Track activity endpoint (for manual tracking from frontend)
export async function trackActivity(req, res) {
  try {
    const { actionType, featureName, pagePath, metadata, durationMs } = req.body;
    const userId = req.user.id || req.user.userId;
    const organizationId = req.user.organization_id || req.user.organizationId;

    await activityService.trackActivity({
      userId,
      organizationId,
      actionType,
      featureName,
      pagePath,
      metadata,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      durationMs
    });

    res.json({ 
      success: true,
      message: 'Activity tracked successfully'
    });
  } catch (error) {
    console.error('[UserActivity] Error tracking activity:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to track activity',
      message: error.message 
    });
  }
}

// Get admin platform-wide statistics (for admin dashboard)
export async function getAdminActivityStats(req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const days = parseInt(req.query.days) || 7;

    // Use null organizationId for platform-wide statistics
    const [activeUsers, avgDuration, featureUsage, timeline, topUsers, recentActivity] = await Promise.all([
      activityService.getActiveUsers(null),
      activityService.getAverageSessionDuration(null, days),
      activityService.getFeatureUsage(null, days),
      activityService.getActivityTimeline(null, days),
      activityService.getTopUsers(null, 10, days),
      activityService.getRecentActivity(null, 20)
    ]);

    res.json({
      success: true,
      data: {
        activeUsers,
        avgSessionDuration: avgDuration,
        featureUsage,
        timeline,
        topUsers,
        recentActivity,
        days
      }
    });
  } catch (error) {
    console.error('[UserActivity] Error getting admin activity stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch admin activity statistics',
      message: error.message 
    });
  }
}

export default {
  getActivityStats,
  getTopActiveUsers,
  getRecentActivity,
  getUserActivity,
  trackActivity,
  getAdminActivityStats
};