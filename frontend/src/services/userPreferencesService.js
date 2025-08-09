import axios from './axiosConfig';

const API_BASE = '/user';

export const userPreferencesService = {
  // Get user preferences
  getPreferences: async () => {
    const response = await axios.get(`${API_BASE}/preferences`);
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const response = await axios.put(`${API_BASE}/preferences`, preferences);
    return response.data.data;
  },

  // Get UI state for a specific key
  getUIState: async (stateKey) => {
    const response = await axios.get(`${API_BASE}/ui-state/${stateKey}`);
    return response.data.data;
  },

  // Update UI state for a specific key
  updateUIState: async (stateKey, stateValue, expiresIn = null) => {
    const response = await axios.put(`${API_BASE}/ui-state/${stateKey}`, {
      stateValue,
      expiresIn
    });
    return response.data.data;
  },

  // Delete UI state for a specific key
  deleteUIState: async (stateKey) => {
    const response = await axios.delete(`${API_BASE}/ui-state/${stateKey}`);
    return response.data;
  }
};

// Helper functions for specific UI states
export const todoSelectionService = {
  getSelectedTodos: async () => {
    const data = await userPreferencesService.getUIState('selected_todo_ids');
    return data || [];
  },

  setSelectedTodos: async (todoIds) => {
    // Keep selected todos for 24 hours (they're temporary bulk operation state)
    return await userPreferencesService.updateUIState('selected_todo_ids', todoIds, 86400);
  },

  clearSelectedTodos: async () => {
    return await userPreferencesService.deleteUIState('selected_todo_ids');
  }
};

export const teamSelectionService = {
  getSelectedTeam: async () => {
    const preferences = await userPreferencesService.getPreferences();
    return preferences.default_team_id;
  },

  setSelectedTeam: async (teamId) => {
    return await userPreferencesService.updatePreferences({
      default_team_id: teamId
    });
  }
};

export const departmentSelectionService = {
  getSelectedDepartment: async () => {
    const preferences = await userPreferencesService.getPreferences();
    return preferences.default_department_id;
  },

  setSelectedDepartment: async (departmentId) => {
    return await userPreferencesService.updatePreferences({
      default_department_id: departmentId
    });
  }
};

export const scorecardPreferencesService = {
  getPreferences: async () => {
    const preferences = await userPreferencesService.getPreferences();
    return {
      rtl: preferences.scorecard_rtl || false,
      showTotal: preferences.scorecard_show_total !== false // Default true
    };
  },

  setRTL: async (rtl) => {
    return await userPreferencesService.updatePreferences({
      scorecard_rtl: rtl
    });
  },

  setShowTotal: async (showTotal) => {
    return await userPreferencesService.updatePreferences({
      scorecard_show_total: showTotal
    });
  }
};