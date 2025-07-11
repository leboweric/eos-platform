import axios from 'axios';

const API_BASE = '/organizations/:orgId/teams/:teamId/scorecard';

// Helper to build URL with org and team IDs
const buildUrl = (endpoint = '') => {
  // Get org from the current auth context
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId;
  
  // For now, use a default team ID since teams aren't implemented yet
  const teamId = '00000000-0000-0000-0000-000000000000';
  
  return API_BASE.replace(':orgId', orgId).replace(':teamId', teamId) + endpoint;
};

export const scorecardService = {
  // Get complete scorecard with metrics and scores
  getScorecard: async () => {
    const response = await axios.get(buildUrl());
    return response.data.data;
  },

  // Create a new metric
  createMetric: async (metric) => {
    const response = await axios.post(buildUrl('/metrics'), metric);
    return response.data.data;
  },

  // Update an existing metric
  updateMetric: async (metricId, metric) => {
    const response = await axios.put(buildUrl(`/metrics/${metricId}`), metric);
    return response.data.data;
  },

  // Delete a metric
  deleteMetric: async (metricId) => {
    await axios.delete(buildUrl(`/metrics/${metricId}`));
  },

  // Update a weekly score
  updateScore: async (metricId, week, value) => {
    const response = await axios.put(buildUrl(`/scores`), {
      metricId,
      week,
      value
    });
    return response.data.data;
  },

  // Get scores for a specific week range
  getScoresForRange: async (startWeek, endWeek) => {
    const response = await axios.get(buildUrl('/scores'), {
      params: { startWeek, endWeek }
    });
    return response.data.data;
  }
};