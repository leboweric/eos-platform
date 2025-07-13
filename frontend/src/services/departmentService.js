import axios from 'axios';

export const departmentService = {
  // Get all departments for the organization
  async getDepartments() {
    const response = await axios.get('/departments');
    return response.data;
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