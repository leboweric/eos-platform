const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const cascadingMessagesService = {
  // Create a cascading message
  async createCascadingMessage(orgId, teamId, data) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/organizations/${orgId}/teams/${teamId}/cascading-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create cascading message: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Get cascading messages for a team
  async getCascadingMessages(orgId, teamId, startDate = null, endDate = null) {
    const token = localStorage.getItem('accessToken');
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/cascading-messages${params.toString() ? '?' + params.toString() : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cascading messages: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Get available teams to cascade to
  async getAvailableTeams(orgId, teamId) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/organizations/${orgId}/teams/${teamId}/cascading-messages/available-teams`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch available teams: ${response.statusText}`);
    }
    
    return await response.json();
  },

  // Mark a message as read
  async markMessageAsRead(orgId, teamId, messageId, recipientTeamId) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/cascading-messages/${messageId}/read`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ teamId: recipientTeamId })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to mark message as read: ${response.statusText}`);
    }
    
    return await response.json();
  }
};