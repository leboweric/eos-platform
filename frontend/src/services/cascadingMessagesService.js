import axios from './axiosConfig';

export const cascadingMessagesService = {
  // Create a cascading message
  async createCascadingMessage(orgId, teamId, data) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/cascading-messages`,
      data
    );
    return response.data;
  },

  // Get cascading messages for a team
  async getCascadingMessages(orgId, teamId, startDate = null, endDate = null) {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/cascading-messages`,
      { params }
    );
    return response.data;
  },

  // Get teams available for cascading
  async getAvailableTeams(orgId, currentTeamId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${currentTeamId}/cascading-messages/available-teams`
    );
    return response.data;
  },

  // Mark a cascading message as read
  async markAsRead(orgId, teamId, messageId) {
    const response = await axios.put(
      `/organizations/${orgId}/teams/${teamId}/cascading-messages/${messageId}/read`
    );
    return response.data;
  },

  // Archive cascading messages after meeting
  async archiveCascadingMessages(orgId, teamId) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/cascading-messages/archive`
    );
    return response.data;
  },

  // LEGACY: Create message (old endpoint structure)
  async createMessage(orgId, data) {
    const response = await axios.post(
      `/organizations/${orgId}/cascading-messages`,
      data
    );
    return response.data;
  }
};