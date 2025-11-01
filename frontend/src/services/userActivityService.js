import axios from './axiosConfig';

const API_BASE = '/admin';

export const userActivityService = {
  // Get activity statistics
  async getActivityStats(days = 7) {
    const response = await axios.get(`${API_BASE}/activity/stats?days=${days}`);
    return response.data;
  },

  // Get top active users
  async getTopUsers(limit = 10, days = 7) {
    const response = await axios.get(`${API_BASE}/activity/top-users?limit=${limit}&days=${days}`);
    return response.data;
  },

  // Get recent activity
  async getRecentActivity(limit = 20) {
    const response = await axios.get(`${API_BASE}/activity/recent?limit=${limit}`);
    return response.data;
  },

  // Get user-specific activity
  async getUserActivity(userId, limit = 50) {
    const response = await axios.get(`${API_BASE}/activity/user/${userId}?limit=${limit}`);
    return response.data;
  },

  // Track activity
  async trackActivity(actionType, featureName, pagePath, metadata = {}, durationMs = null) {
    try {
      await axios.post(`${API_BASE}/activity/track`, {
        actionType,
        featureName,
        pagePath,
        metadata,
        durationMs
      });
    } catch (error) {
      // Don't let activity tracking errors break the app
      console.error('[ActivityTracking] Error tracking activity:', error);
    }
  }
};

export default userActivityService;