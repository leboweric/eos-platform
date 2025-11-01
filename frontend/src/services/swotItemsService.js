import axios from './axiosConfig';

const swotItemsService = {
  // Get all SWOT items for a team and year
  getTeamSwotItems: async (organizationId, teamId, year) => {
    const response = await axios.get(
      `/organizations/${organizationId}/teams/${teamId}/swot-items`,
      { params: { year } }
    );
    return response.data;
  },

  // Create a new SWOT item
  createSwotItem: async (organizationId, teamId, data) => {
    const response = await axios.post(
      `/organizations/${organizationId}/teams/${teamId}/swot-items`,
      data
    );
    return response.data;
  },

  // Update a SWOT item
  updateSwotItem: async (organizationId, teamId, itemId, data) => {
    const response = await axios.put(
      `/organizations/${organizationId}/teams/${teamId}/swot-items/${itemId}`,
      data
    );
    return response.data;
  },

  // Delete a SWOT item (soft delete)
  deleteSwotItem: async (organizationId, teamId, itemId) => {
    const response = await axios.delete(
      `/organizations/${organizationId}/teams/${teamId}/swot-items/${itemId}`
    );
    return response.data;
  }
};

export default swotItemsService;