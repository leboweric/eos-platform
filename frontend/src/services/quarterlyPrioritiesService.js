const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const quarterlyPrioritiesService = {
  // Get all priorities for a quarter
  async getQuarterlyPriorities(orgId, teamId, quarter, year) {
    const token = localStorage.getItem('accessToken');
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
    const token = localStorage.getItem('accessToken');
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
    const token = localStorage.getItem('accessToken');
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
    const token = localStorage.getItem('accessToken');
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

  // Archive a priority (soft delete)
  async archivePriority(orgId, teamId, priorityId) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/archive`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to archive priority');
    }
  },

  // Update predictions
  async updatePredictions(orgId, teamId, predictions) {
    const token = localStorage.getItem('accessToken');
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

  // Create milestone
  async createMilestone(orgId, teamId, priorityId, milestoneData) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(milestoneData),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create milestone');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Update milestone
  async updateMilestone(orgId, teamId, priorityId, milestoneId, updates) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      }
    );
    
    if (response.status === 404) {
      const errorData = await response.json();
      console.warn(`Milestone ${milestoneId} not found:`, errorData);
      const error = new Error(errorData.error || 'Milestone not found');
      error.status = 404;
      error.milestoneId = milestoneId;
      throw error;
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update milestone');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Delete milestone
  async deleteMilestone(orgId, teamId, priorityId, milestoneId) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (response.status === 404) {
      const errorData = await response.json();
      console.warn(`Milestone ${milestoneId} not found for deletion:`, errorData);
      // Don't throw for 404 on delete - it's already gone
      return;
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete milestone');
    }
  },

  // Get archived priorities (all non-current quarters)
  async getArchivedPriorities(orgId, teamId) {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/quarterly-priorities/archived`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch archived priorities');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Add priority update
  async addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange) {
    const token = localStorage.getItem('accessToken');
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