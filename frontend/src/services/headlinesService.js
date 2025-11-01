import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  const user = useAuthStore.getState().user;
  return user?.organizationId || user?.organization_id;
};

export const headlinesService = {
  // Get all headlines
  getHeadlines: async (teamId = null, includeArchived = false) => {
    const orgId = getOrgId();
    
    const params = {};
    if (teamId) params.teamId = teamId;
    if (includeArchived) params.includeArchived = 'true';
    
    const response = await axios.get(
      `/organizations/${orgId}/headlines`,
      { params }
    );
    return response.data;
  },

  // Create a new headline
  createHeadline: async (headlineData) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/headlines`,
      headlineData
    );
    return response.data;
  },

  // Update a headline
  updateHeadline: async (headlineId, text) => {
    const orgId = getOrgId();
    
    const response = await axios.put(
      `/organizations/${orgId}/headlines/${headlineId}`,
      { text }
    );
    return response.data;
  },

  // Delete a headline
  deleteHeadline: async (headlineId) => {
    const orgId = getOrgId();
    
    const response = await axios.delete(
      `/organizations/${orgId}/headlines/${headlineId}`
    );
    return response.data;
  },

  // Archive a single headline
  archiveHeadline: async (headlineId) => {
    const orgId = getOrgId();
    
    const response = await axios.put(
      `/organizations/${orgId}/headlines/${headlineId}/archive`
    );
    return response.data;
  },

  // Archive headlines (after meeting conclusion)
  archiveHeadlines: async (teamId = null) => {
    const orgId = getOrgId();
    
    const response = await axios.put(
      `/organizations/${orgId}/headlines/archive`,
      { teamId }
    );
    return response.data;
  }
};