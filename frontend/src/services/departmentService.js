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

  // Get single department (actually a team)
  async getDepartment(id) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    const response = await axios.get(`/organizations/${orgId}/teams/${id}`);
    return response.data;
  },

  // Create new department (actually a team)
  async createDepartment(departmentData) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    const response = await axios.post(`/organizations/${orgId}/teams`, departmentData);
    return response.data;
  },

  // Update department (actually a team)
  async updateDepartment(id, departmentData) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    // Use the teams endpoint since departments are implemented as teams
    const response = await axios.put(`/organizations/${orgId}/teams/${id}`, departmentData);
    return response.data;
  },

  // Delete department (actually a team)
  async deleteDepartment(id) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    const response = await axios.delete(`/organizations/${orgId}/teams/${id}`);
    return response.data;
  },

  // Add member to department
  async addMember(departmentId, userId) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    const response = await axios.post(`/organizations/${orgId}/teams/${departmentId}/members`, { userId });
    return response.data;
  },

  // Remove member from department
  async removeMember(departmentId, userId) {
    const user = useAuthStore.getState().user;
    const orgId = user?.organizationId || user?.organization_id;
    
    const response = await axios.delete(`/organizations/${orgId}/teams/${departmentId}/members/${userId}`);
    return response.data;
  }
};