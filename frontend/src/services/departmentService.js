import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

export const departmentService = {
  // Get all departments for the organization
  async getDepartments() {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    // Try both endpoints - with and without organization ID
    try {
      const response = await axios.get(`/organizations/${orgId}/teams`);
      console.log('Departments fetched with org ID:', response.data);
      return response.data;
    } catch (error) {
      console.log('Trying fallback endpoint /departments');
      const response = await axios.get('/departments');
      return response.data;
    }
  },

  // Get single department
  async getDepartment(id) {
    const response = await axios.get(`/departments/${id}`);
    return response.data;
  },

  // Create new department
  async createDepartment(departmentData) {
    const response = await axios.post('/departments', departmentData);
    return response.data;
  },

  // Update department
  async updateDepartment(id, departmentData) {
    const response = await axios.put(`/departments/${id}`, departmentData);
    return response.data;
  },

  // Delete department
  async deleteDepartment(id) {
    const response = await axios.delete(`/departments/${id}`);
    return response.data;
  }
};