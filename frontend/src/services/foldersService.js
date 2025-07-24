import axios from './axiosConfig';

export const foldersService = {
  // Get all folders for an organization
  async getFolders(orgId) {
    const response = await axios.get(`/organizations/${orgId}/folders`);
    return response.data.data;
  },

  // Create a new folder
  async createFolder(orgId, folderData) {
    const response = await axios.post(
      `/organizations/${orgId}/folders`,
      folderData
    );
    return response.data.data;
  },

  // Update folder name
  async updateFolder(orgId, folderId, name) {
    const response = await axios.put(
      `/organizations/${orgId}/folders/${folderId}`,
      { name }
    );
    return response.data.data;
  },

  // Delete a folder
  async deleteFolder(orgId, folderId) {
    const response = await axios.delete(
      `/organizations/${orgId}/folders/${folderId}`
    );
    return response.data;
  }
};