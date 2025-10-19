import axios from './axiosConfig';

const API_BASE = '/scorecard/import';

const scorecardImportService = {
  /**
   * Preview import without saving
   */
  preview: async (formData) => {
    const response = await axios.post(`${API_BASE}/preview`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Execute the actual import
   */
  execute: async (formData) => {
    const response = await axios.post(`${API_BASE}/execute`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get import history for an organization
   */
  getHistory: async (organizationId) => {
    const response = await axios.get(`${API_BASE}/history/${organizationId}`);
    return response.data;
  }
};

export default scorecardImportService;