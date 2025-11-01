import axios from './axiosConfig';

const annualPlanningGoalsService = {
  // Get planning goals for a team and year
  getPlanningGoals: async (organizationId, teamId, year) => {
    const response = await axios.get(
      `/organizations/${organizationId}/teams/${teamId}/annual-planning-goals`,
      { params: { year } }
    );
    return response.data;
  },

  // Save/update planning goals
  savePlanningGoals: async (organizationId, teamId, year, goals) => {
    const response = await axios.put(
      `/organizations/${organizationId}/teams/${teamId}/annual-planning-goals`,
      { year, goals }
    );
    return response.data;
  },

  // Publish planning goals to VTO (January operation - for future use)
  publishToVTO: async (organizationId, teamId, year) => {
    const response = await axios.post(
      `/organizations/${organizationId}/teams/${teamId}/annual-planning-goals/publish`,
      { year }
    );
    return response.data;
  }
};

export default annualPlanningGoalsService;