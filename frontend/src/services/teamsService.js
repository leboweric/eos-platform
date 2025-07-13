import axios from 'axios';

const getOrgId = () => {
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  return localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
};

export const teamsService = {
  // Get user's teams
  getUserTeams: async () => {
    const orgId = getOrgId();
    
    try {
      // For now, since the teams endpoint returns "coming soon",
      // we'll return a default team that should exist for every organization
      return {
        success: true,
        data: {
          teams: [{
            id: 'default-team-' + orgId,
            name: 'Leadership Team',
            description: 'Default leadership team',
            organization_id: orgId
          }]
        }
      };
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw error;
    }
  },

  // Get team details
  getTeam: async (teamId) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.get(`/organizations/${orgId}/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch team:', error);
      throw error;
    }
  }
};