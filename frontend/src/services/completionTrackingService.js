import axios from './axiosConfig';

export const completionTrackingService = {
  // Get all completion states for an organization
  async getCompletionStates(orgId) {
    const response = await axios.get(`/api/v1/organizations/${orgId}/completion-states`);
    return response.data;
  },

  // Toggle 3-year picture item completion
  async toggleThreeYearItem(orgId, itemIndex) {
    const response = await axios.put(`/api/v1/organizations/${orgId}/three-year-items/${itemIndex}/toggle`);
    return response.data;
  },

  // Toggle 1-year plan goal completion
  async toggleOneYearGoal(orgId, goalIndex) {
    const response = await axios.put(`/api/v1/organizations/${orgId}/one-year-goals/${goalIndex}/toggle`);
    return response.data;
  }
};