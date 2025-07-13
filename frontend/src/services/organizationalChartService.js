import axios from './axiosSetup';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  // First check for impersonated org ID
  const impersonatedOrgId = localStorage.getItem('impersonatedOrgId');
  if (impersonatedOrgId) {
    return impersonatedOrgId;
  }
  
  // Get user from Zustand store
  const user = useAuthStore.getState().user;
  
  // Check the user object directly if it exists
  if (user?.organizationId) {
    return user.organizationId;
  }
  
  // Fallback: try to get from the user's organization_id field (different naming)
  if (user?.organization_id) {
    return user.organization_id;
  }
  
  // If still not found, log for debugging
  console.warn('Organization ID not found in auth store:', user);
  return null;
};

export const organizationalChartService = {
  // Chart operations
  getCharts: async (includeShared = false) => {
    const orgId = getOrgId();
    const response = await axios.get(
      `/organizations/${orgId}/organizational-charts`,
      { params: { includeShared } }
    );
    return response.data.data;
  },

  getChart: async (chartId) => {
    const orgId = getOrgId();
    const response = await axios.get(
      `/organizations/${orgId}/organizational-charts/${chartId}`
    );
    return response.data.data;
  },

  createChart: async (chartData) => {
    const orgId = getOrgId();
    const response = await axios.post(
      `/organizations/${orgId}/organizational-charts`,
      chartData
    );
    return response.data.data;
  },

  updateChart: async (chartId, chartData) => {
    const orgId = getOrgId();
    const response = await axios.put(
      `/organizations/${orgId}/organizational-charts/${chartId}`,
      chartData
    );
    return response.data.data;
  },

  deleteChart: async (chartId) => {
    const orgId = getOrgId();
    await axios.delete(
      `/organizations/${orgId}/organizational-charts/${chartId}`
    );
  },

  // Position operations
  addPosition: async (chartId, positionData) => {
    const orgId = getOrgId();
    const response = await axios.post(
      `/organizations/${orgId}/organizational-charts/${chartId}/positions`,
      positionData
    );
    return response.data.data;
  },

  updatePosition: async (chartId, positionId, positionData) => {
    const orgId = getOrgId();
    const response = await axios.put(
      `/organizations/${orgId}/organizational-charts/${chartId}/positions/${positionId}`,
      positionData
    );
    return response.data.data;
  },

  deletePosition: async (chartId, positionId) => {
    const orgId = getOrgId();
    await axios.delete(
      `/organizations/${orgId}/organizational-charts/${chartId}/positions/${positionId}`
    );
  },

  // Position holder operations
  assignPositionHolder: async (chartId, positionId, holderData) => {
    const orgId = getOrgId();
    const response = await axios.post(
      `/organizations/${orgId}/organizational-charts/${chartId}/positions/${positionId}/assign`,
      holderData
    );
    return response.data.data;
  },

  removePositionHolder: async (chartId, positionId) => {
    const orgId = getOrgId();
    await axios.delete(
      `/organizations/${orgId}/organizational-charts/${chartId}/positions/${positionId}/holder`
    );
  }
};

// Skills service
export const skillsService = {
  getOrganizationSkills: async (category = null) => {
    const orgId = getOrgId();
    const response = await axios.get(
      `/organizations/${orgId}/skills`,
      category ? { params: { category } } : {}
    );
    return response.data.data;
  },

  createSkill: async (skillData) => {
    const orgId = getOrgId();
    const response = await axios.post(
      `/organizations/${orgId}/skills`,
      skillData
    );
    return response.data.data;
  },

  updateSkill: async (skillId, skillData) => {
    const orgId = getOrgId();
    const response = await axios.put(
      `/organizations/${orgId}/skills/${skillId}`,
      skillData
    );
    return response.data.data;
  },

  deleteSkill: async (skillId) => {
    const orgId = getOrgId();
    await axios.delete(`/organizations/${orgId}/skills/${skillId}`);
  },

  // User skills
  getUserSkills: async (userId) => {
    const orgId = getOrgId();
    const response = await axios.get(
      `/organizations/${orgId}/users/${userId}/skills`
    );
    return response.data.data;
  },

  updateUserSkill: async (userId, skillData) => {
    const orgId = getOrgId();
    const response = await axios.post(
      `/organizations/${orgId}/users/${userId}/skills`,
      skillData
    );
    return response.data.data;
  },

  removeUserSkill: async (userId, skillId) => {
    const orgId = getOrgId();
    await axios.delete(
      `/organizations/${orgId}/users/${userId}/skills/${skillId}`
    );
  }
};