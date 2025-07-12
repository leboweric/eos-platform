const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const quarterlyPrioritiesService = {
  // Get all priorities for a quarter
  async getQuarterlyPriorities(orgId, teamId, quarter, year) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities?quarter=${quarter}&year=${year}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch quarterly priorities');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Create a new priority
  async createPriority(orgId, teamId, priorityData) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(priorityData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create priority');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Update a priority
  async updatePriority(orgId, teamId, priorityId, updates) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update priority');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Delete a priority
  async deletePriority(orgId, teamId, priorityId) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete priority');
    }
  },

  // Update predictions
  async updatePredictions(orgId, teamId, predictions) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/predictions`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(predictions),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update predictions');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Update milestone
  async updateMilestone(orgId, teamId, milestoneId, completed) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/milestones/${milestoneId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update milestone');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Add priority update
  async addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange) {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updateText, statusChange }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to add update');
    }
    
    const data = await response.json();
    return data.data;
  },
};