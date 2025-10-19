import axios from './axiosConfig';

const API_BASE = '/admin';

export const adminService = {
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