import api from './axiosConfig';

export const userService = {
  async getOrganizationUsers(orgId) {
    try {
      const response = await api.get(`/users/organization/${orgId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching organization users:', error);
      throw error;
    }
  },

  async getUserById(userId) {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await api.delete(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  async inviteUser(orgId, inviteData) {
    try {
      const response = await api.post(`/users/invite`, {
        organizationId: orgId,
        ...inviteData
      });
      return response.data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  },

  async changePassword(userId, passwordData) {
    try {
      const response = await api.put(`/users/${userId}/password`, passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
};