import axios from './axiosSetup';

export const organizationService = {
  // Get current organization details
  getOrganization: async () => {
    const response = await axios.get('/organizations/current');
    return response.data.data;
  },

  // Update organization details
  updateOrganization: async (data) => {
    const response = await axios.put('/organizations/current', data);
    return response.data;
  },

  // Upload organization logo
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    
    const response = await axios.post('/organizations/current/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Get organization logo URL
  getLogoUrl: (orgId) => {
    if (!orgId) return null;
    return `${axios.defaults.baseURL}/organizations/${orgId}/logo`;
  },

  // Delete organization logo
  deleteLogo: async () => {
    const response = await axios.delete('/organizations/current/logo');
    return response.data;
  }
};