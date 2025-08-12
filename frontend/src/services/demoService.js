import axios from './axiosConfig';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const demoService = {
  // Get demo reset status
  getResetStatus: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/demo/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching demo status:', error);
      throw error;
    }
  },

  // Reset demo organization
  resetDemo: async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/demo/reset`);
      return response.data;
    } catch (error) {
      console.error('Error resetting demo:', error);
      throw error;
    }
  }
};