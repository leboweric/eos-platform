import { pool } from '../config/database.js';

export class ActivityTrackingService {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new ActivityTrackingService();
    }
    return this.instance;
  }

  // Track a user action
  async trackActivity({
    userId,
    organizationId,
    actionType,
    featureName,
    pagePath = null,
    metadata = {},
    sessionId = null,
    ipAddress = null,
    userAgent = null,
    durationMs = null
  }) {
    try {
      const query = `
        INSERT INTO user_activity (
          user_id, organization_id, action_type, feature_name,
          page_path, metadata, session_id, ip_address, user_agent, duration_ms
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const result = await pool.query(query, [
        userId,
        organizationId,
        actionType,
        featureName,
        pagePath,
        JSON.stringify(metadata),
        sessionId,
        ipAddress,
        userAgent,
        durationMs
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('[ActivityTracking] Error tracking activity:', error);
      // Don't throw - we don't want activity tracking to break the app
      return null;
    }
  }

  // Get Daily/Weekly/Monthly Active Users
  async getActiveUsers(organizationId) {
    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN user_id END) as dau,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN user_id END) as wau,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN user_id END) as mau
      FROM user_activity
      WHERE organization_id = $1
    `;

    const result = await pool.query(query, [organizationId]);
    return {
      dau: parseInt(result.rows[0].dau || 0),
      wau: parseInt(result.rows[0].wau || 0),
      mau: parseInt(result.rows[0].mau || 0)
    };
  }

  // Get average session duration
  async getAverageSessionDuration(organizationId, days = 7) {
    const query = `
      SELECT AVG(duration_ms) as avg_duration
      FROM user_activity
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND duration_ms IS NOT NULL
    `;

    const result = await pool.query(query, [organizationId]);
    return Math.round(result.rows[0].avg_duration || 0);
  }

  // Get top active users
  async getTopUsers(organizationId, limit = 10, days = 7) {
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(*) as activity_count,
        COUNT(DISTINCT DATE(ua.created_at)) as active_days,
        MAX(ua.created_at) as last_active
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.organization_id = $1
        AND ua.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY u.id, u.first_name, u.last_name, u.email
      ORDER BY activity_count DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [organizationId, limit]);
    return result.rows;
  }

  // Get feature usage statistics
  async getFeatureUsage(organizationId, days = 7) {
    const query = `
      SELECT 
        feature_name,
        COUNT(*) as usage_count,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(COUNT(*)::numeric / COUNT(DISTINCT user_id), 2) as avg_per_user
      FROM user_activity
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY feature_name
      ORDER BY usage_count DESC
    `;

    const result = await pool.query(query, [organizationId]);
    return result.rows;
  }

  // Get activity timeline (daily breakdown)
  async getActivityTimeline(organizationId, days = 7) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activity_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_activity
      WHERE organization_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await pool.query(query, [organizationId]);
    return result.rows;
  }

  // Get user-specific activity
  async getUserActivity(userId, limit = 50) {
    const query = `
      SELECT 
        action_type,
        feature_name,
        page_path,
        metadata,
        created_at
      FROM user_activity
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  // Get recent activity (for the dashboard)
  async getRecentActivity(organizationId, limit = 20) {
    const query = `
      SELECT 
        ua.action_type,
        ua.feature_name,
        ua.page_path,
        ua.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM user_activity ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.organization_id = $1
      ORDER BY ua.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [organizationId, limit]);
    return result.rows;
  }
}

export default ActivityTrackingService;