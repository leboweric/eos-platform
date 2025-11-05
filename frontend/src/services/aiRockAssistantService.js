import api from './axiosConfig';

const AI_BASE_URL = '/ai/rock-assistant';

export const aiRockAssistantService = {
  /**
   * Check if AI service is configured
   */
  async checkConfiguration(orgId) {
    const response = await api.get(`/organizations/${orgId}${AI_BASE_URL}/status`);
    return response.data;
  },

  /**
   * Analyze a Rock for SMART criteria
   */
  async analyzeRock(orgId, { title, description, saveAnalysis = true }) {
    const response = await api.post(`/organizations/${orgId}${AI_BASE_URL}/analyze`, {
      title,
      description,
      saveAnalysis
    });
    return response.data;
  },

  /**
   * Generate milestone suggestions for a Rock
   */
  async suggestMilestones(orgId, { title, description, dueDate, startDate }) {
    const response = await api.post(`/organizations/${orgId}${AI_BASE_URL}/suggest-milestones`, {
      title,
      description,
      dueDate,
      startDate
    });
    return response.data;
  },

  /**
   * Check alignment with Company Rocks
   */
  async checkAlignment(orgId, teamId, departmentRock) {
    const response = await api.post(`/organizations/${orgId}${AI_BASE_URL}/check-alignment`, {
      departmentRock,
      teamId
    });
    return response.data;
  },

  /**
   * Generate a complete SMART Rock from an idea
   */
  async generateRock(orgId, { idea, quarter, year, teamName, ownerName }) {
    const response = await api.post(`/organizations/${orgId}${AI_BASE_URL}/generate`, {
      idea,
      quarter,
      year,
      teamName,
      ownerName
    });
    return response.data;
  },

  /**
   * Mark a suggestion as applied
   */
  async applySuggestion(orgId, suggestionId) {
    const response = await api.put(
      `/organizations/${orgId}${AI_BASE_URL}/suggestions/${suggestionId}/apply`
    );
    return response.data;
  },

  /**
   * Get suggestion history
   */
  async getSuggestionHistory(orgId, { limit = 50, offset = 0, type, applied } = {}) {
    const params = new URLSearchParams();
    params.append('limit', limit);
    params.append('offset', offset);
    if (type) params.append('type', type);
    if (applied !== undefined) params.append('applied', applied);

    const response = await api.get(
      `/organizations/${orgId}${AI_BASE_URL}/suggestions?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Generate multiple SMART Rock options from a vision
   */
  async generateFromVision(orgId, { vision, industry, challenges, userId, numberOfOptions = 3 }) {
    const response = await api.post(`/organizations/${orgId}${AI_BASE_URL}/generate-from-vision`, {
      vision,
      industry,
      challenges,
      userId,
      numberOfOptions
    });
    return response.data;
  }
};