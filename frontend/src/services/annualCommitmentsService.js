import axios from './axiosConfig';

const annualCommitmentsService = {
  // Get all commitments for an organization (across all teams)
  getOrganizationCommitments: async (organizationId, year) => {
    const response = await axios.get(
      `/organizations/${organizationId}/annual-commitments`,
      { params: { year } }
    );
    return response.data;
  },

  // Get all commitments for a team/year
  getTeamCommitments: async (organizationId, teamId, year) => {
    const response = await axios.get(
      `/organizations/${organizationId}/teams/${teamId}/annual-commitments`,
      { params: { year } }
    );
    return response.data;
  },

  // Create or update commitment
  upsertCommitment: async (organizationId, teamId, data) => {
    const response = await axios.post(
      `/organizations/${organizationId}/teams/${teamId}/annual-commitments`,
      data
    );
    return response.data;
  },

  // Delete commitment
  deleteCommitment: async (organizationId, teamId, commitmentId) => {
    const response = await axios.delete(
      `/organizations/${organizationId}/teams/${teamId}/annual-commitments/${commitmentId}`
    );
    return response.data;
  },

  // Get user's current commitment for dashboard
  getUserCurrentCommitment: async (organizationId, userId) => {
    try {
      const response = await axios.get(
        `/organizations/${organizationId}/users/${userId}/annual-commitments/current`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        // No commitment exists - this is expected, not an error
        return null;
      }
      throw error;
    }
  }
};

export default annualCommitmentsService;