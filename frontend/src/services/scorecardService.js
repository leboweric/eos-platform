import axios from './axiosConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Scorecard service for managing scorecard metric data
 * 
 * Metric objects now include publishing fields:
 * - is_published_to_departments: boolean indicating if visible to non-leadership teams
 * - published_at: timestamp when published
 * - published_by: ID of user who published
 */
export const scorecardService = {
  // Update metric order
  updateMetricOrder: async (orgId, teamId, metrics) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics/reorder`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metrics }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update metric order');
    }
    
    const data = await response.json();
    return data;
  },
  
  // Get complete scorecard with metrics and scores
  getScorecard: async (orgId, teamId, departmentId = null) => {
    const token = localStorage.getItem('accessToken');
    let url = `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard`;
    if (departmentId) {
      url += `?department_id=${departmentId}`;
    }
    const response = await fetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch scorecard');
    }
    
    const data = await response.json();
    return data.data || data;
  },

  // Create a new metric
  createMetric: async (orgId, teamId, metric) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(metric),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to create metric');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Update an existing metric
  updateMetric: async (orgId, teamId, metricId, metric) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics/${metricId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(metric),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update metric');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Delete a metric
  deleteMetric: async (orgId, teamId, metricId) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/metrics/${metricId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to delete metric');
    }
  },

  // Update a weekly or monthly score
  updateScore: async (orgId, teamId, metricId, period, value, scoreType = 'weekly') => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/scores`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metricId,
          week: period, // Keep as 'week' for backward compatibility
          value,
          scoreType
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to update score');
    }
    
    const data = await response.json();
    return data.data;
  },

  // Get scores for a specific week range
  getScoresForRange: async (orgId, teamId, startWeek, endWeek) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${API_URL}/organizations/${orgId}/teams/${teamId}/scorecard/scores?startWeek=${startWeek}&endWeek=${endWeek}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch scores');
    }
    
    const data = await response.json();
    return data.data;
  }
};