import axios from './axiosConfig';

const API_BASE = '/admin';

export const adminService = {
  // Get system health metrics
  getSystemHealth: async () => {
    const response = await axios.get(`${API_BASE}/system-health`);
    return response.data;
  },

  // Get active meetings
  getActiveMeetings: async () => {
    const response = await axios.get(`${API_BASE}/active-meetings`);
    return response.data;
  },

  // Failed Operations APIs
  getFailedOperations: async (params = {}) => {
    const response = await axios.get(`${API_BASE}/failed-operations`, { params });
    return response.data;
  },

  getFailureStatistics: async (hours = 24) => {
    const response = await axios.get(`${API_BASE}/failed-operations/statistics`, { 
      params: { hours } 
    });
    return response.data;
  },

  getCriticalFailures: async () => {
    const response = await axios.get(`${API_BASE}/failed-operations/critical`);
    return response.data;
  },

  getRecentFailures: async (count = 10) => {
    const response = await axios.get(`${API_BASE}/failed-operations/recent`, {
      params: { count }
    });
    return response.data;
  },

  resolveFailure: async (id) => {
    const response = await axios.post(`${API_BASE}/failed-operations/${id}/resolve`);
    return response.data;
  },

  bulkResolveFailures: async (ids) => {
    const response = await axios.post(`${API_BASE}/failed-operations/bulk-resolve`, { ids });
    return response.data;
  },

  getDailySummary: async (days = 30) => {
    const response = await axios.get(`${API_BASE}/failed-operations/daily-summary`, {
      params: { days }
    });
    return response.data;
  },

  // Download bulk import template
  downloadBulkImportTemplate: async () => {
    const response = await axios.get(`${API_BASE}/users/bulk-import/template`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  },

  // Preview bulk import
  previewBulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE}/users/bulk-import/preview`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Perform bulk import
  performBulkImport: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE}/users/bulk-import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};