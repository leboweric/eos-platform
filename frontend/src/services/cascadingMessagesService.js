import api from './api';

export const cascadingMessagesService = {
  // Create a cascading message
  async createCascadingMessage(orgId, teamId, data) {
    const response = await api.post(`/organizations/${orgId}/teams/${teamId}/cascading-messages`, data);
    return response.data;
  },

  // Get cascading messages for a team
  async getCascadingMessages(orgId, teamId, startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await api.get(`/organizations/${orgId}/teams/${teamId}/cascading-messages`, { params });
    return response.data;
  },

  // Get available teams to cascade to
  async getAvailableTeams(orgId, teamId) {
    const response = await api.get(`/organizations/${orgId}/teams/${teamId}/cascading-messages/available-teams`);
    return response.data;
  },

  // Mark a message as read
  async markMessageAsRead(orgId, teamId, messageId, recipientTeamId) {
    const response = await api.put(
      `/organizations/${orgId}/teams/${teamId}/cascading-messages/${messageId}/read`,
      { teamId: recipientTeamId }
    );
    return response.data;
  }
};