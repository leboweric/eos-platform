import axios from './axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const terminologyService = {
  // Get terminology for an organization
  getTerminology: async (orgId) => {
    const response = await axios.get(`${API_BASE_URL}/terminology/organizations/${orgId}`);
    return response.data;
  },

  // Update terminology for an organization
  updateTerminology: async (orgId, updates) => {
    const response = await axios.put(`${API_BASE_URL}/terminology/organizations/${orgId}`, updates);
    return response.data;
  },

  // Get available presets
  getPresets: async () => {
    const response = await axios.get(`${API_BASE_URL}/terminology/presets`);
    return response.data;
  },

  // Apply a preset to an organization
  applyPreset: async (orgId, preset) => {
    const response = await axios.post(`${API_BASE_URL}/terminology/organizations/${orgId}/apply-preset`, { preset });
    return response.data;
  },

  // Reset terminology to defaults
  resetToDefaults: async (orgId) => {
    const response = await axios.post(`${API_BASE_URL}/terminology/organizations/${orgId}/reset`);
    return response.data;
  }
};