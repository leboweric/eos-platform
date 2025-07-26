const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const scorecardGroupsService = {
  // Get all groups for a team
  getGroups: async (orgId, teamId) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/groups`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch groups');
    }
    
    const data = await response.json();
    return data.data || [];
  },

  // Create a new group
  createGroup: async (orgId, teamId, group) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/groups`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(group),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create group');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Update a group
  updateGroup: async (orgId, teamId, groupId, updates) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/groups/${groupId}`,
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
      throw new Error('Failed to update group');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Delete a group
  deleteGroup: async (orgId, teamId, groupId) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/groups/${groupId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete group');
    }
  },

  // Update group order
  updateGroupOrder: async (orgId, teamId, groups) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/groups/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ groups }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update group order');
    }
  },

  // Move metric to group
  moveMetricToGroup: async (orgId, teamId, metricId, groupId) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics/move-to-group`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metricId, groupId }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to move metric to group');
    }
    
    const data = await response.json();
    return data.data;
  },
};