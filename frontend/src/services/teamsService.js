import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  // Get user from Zustand store
  const user = useAuthStore.getState().user;
  
  // Check for impersonated org ID first, then user's organization ID
  const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
  
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
  },

  // Create a new team
  createTeam: async (teamData) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.post(`/api/teams`, {
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
      const response = await axios.put(`/api/teams/${teamId}`, {
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
      const response = await axios.delete(`/api/teams/${teamId}`, {
        params: { organization_id: orgId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to delete team:', error);
      throw error;
    }
  },

  // Get team members
  getTeamMembers: async (teamId) => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.get(`/api/teams/${teamId}/members`, {
        params: { organization_id: orgId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      throw error;
    }
  },

  // Add team member
  addTeamMember: async (teamId, userId, role = 'member') => {
    const orgId = getOrgId();
    
    try {
      const response = await axios.post(`/api/teams/${teamId}/members`, {
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
      const response = await axios.delete(`/api/teams/${teamId}/members/${userId}`, {
        params: { organization_id: orgId }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to remove team member:', error);
      throw error;
    }
  }
};