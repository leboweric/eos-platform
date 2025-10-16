import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  // Get user from Zustand store
  const user = useAuthStore.getState().user;
  
  // Get user's organization ID
  const orgId = user?.organizationId || user?.organization_id;
  
  return orgId;
};

export const teamsService = {
  // Get all teams for the organization
  getTeams: async () => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.get(`/organizations/${orgId}/teams`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      throw error;
    }
  },

  // Get user's teams
  getUserTeams: async () => {
    const orgId = getOrgId();
    
    try {
      // Fetch actual teams from the backend
      const response = await axios.get(`/organizations/${orgId}/teams`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      // Return empty array instead of fake team if API fails
      return {
        success: false,
        data: {
          teams: []
        }
      };
    }
  },

  // Get team details - accepts orgId as param for hook usage
  getTeam: async (orgIdParam, teamId) => {
    // Support both old signature (teamId only) and new (orgId, teamId)
    let orgId, actualTeamId;
    if (teamId === undefined) {
      // Old signature: getTeam(teamId)
      orgId = getOrgId();
      actualTeamId = orgIdParam;
    } else {
      // New signature: getTeam(orgId, teamId)
      orgId = orgIdParam;
      actualTeamId = teamId;
    }
    
    try {
      const response = await axios.get(`/organizations/${orgId}/teams/${actualTeamId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch team:', error);
      throw error;
    }
  },

  // Create a new team
  createTeam: async (teamData) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.post(`/organizations/${orgId}/teams`, {
        ...teamData,
        organization_id: orgId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to create team:', error);
      throw error;
    }
  },

  // Update team
  updateTeam: async (teamId, teamData) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.put(`/organizations/${orgId}/teams/${teamId}`, {
        ...teamData,
        organization_id: orgId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to update team:', error);
      throw error;
    }
  },

  // Delete team
  deleteTeam: async (teamId) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.delete(`/organizations/${orgId}/teams/${teamId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete team:', error);
      throw error;
    }
  },

  // Get team members - accepts orgId as param for hook usage
  getTeamMembers: async (orgIdParam, teamId) => {
    // Support both old signature (teamId only) and new (orgId, teamId)
    let orgId, actualTeamId;
    if (teamId === undefined) {
      // Old signature: getTeamMembers(teamId)
      orgId = getOrgId();
      actualTeamId = orgIdParam;
    } else {
      // New signature: getTeamMembers(orgId, teamId)
      orgId = orgIdParam;
      actualTeamId = teamId;
    }
    
    try {
      const response = await axios.get(`/organizations/${orgId}/teams/${actualTeamId}/members`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      throw error;
    }
  },

  // Get all organization users
  getAllOrganizationUsers: async (orgIdParam) => {
    const orgId = orgIdParam || getOrgId();
    
    try {
      const response = await axios.get(`/organizations/${orgId}/users`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch organization users:', error);
      throw error;
    }
  },

  // Add team member
  addTeamMember: async (teamId, userId, role = 'member') => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.post(`/organizations/${orgId}/teams/${teamId}/members`, {
        user_id: userId,
        role,
        organization_id: orgId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to add team member:', error);
      throw error;
    }
  },

  // Remove team member
  removeTeamMember: async (teamId, userId) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.delete(`/organizations/${orgId}/teams/${teamId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to remove team member:', error);
      throw error;
    }
  }
};