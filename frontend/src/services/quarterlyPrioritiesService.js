import axios from 'axios';

/**
 * Quarterly priorities service for managing priority data
 * 
 * Priority objects now include publishing fields:
 * - is_published_to_departments: boolean indicating if visible to non-leadership teams
 * - published_at: timestamp when published
 * - published_by: ID of user who published
 */
export const quarterlyPrioritiesService = {
  // Get current priorities (simplified - no quarter logic)
  async getCurrentPriorities(orgId, teamId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/current`
    );
    
    console.log('API Response:', response.data);
    
    // Ensure we always return the expected structure
    return {
      companyPriorities: response.data.data?.companyPriorities || [],
      teamMemberPriorities: response.data.data?.teamMemberPriorities || {},
      predictions: response.data.data?.predictions || {},
      teamMembers: response.data.data?.teamMembers || []
    };
  },

  // Get all priorities for a quarter
  async getQuarterlyPriorities(orgId, teamId, quarter, year) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities`,
      { params: { quarter, year } }
    );
    
    return response.data.data;
  },

  // Create a new priority
  async createPriority(orgId, teamId, priorityData) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities`,
      priorityData
    );
    
    return response.data.data;
  },

  // Update a priority
  async updatePriority(orgId, teamId, priorityId, updates) {
    console.log('[Service] Updating priority with:', updates);
    
    const response = await axios.put(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}`,
      updates
    );
    
    return response.data.data;
  },

  // Delete a priority
  async deletePriority(orgId, teamId, priorityId) {
    await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}`
    );
  },

  // Archive a priority (soft delete)
  async archivePriority(orgId, teamId, priorityId) {
    await axios.put(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/archive`
    );
  },

  // Update predictions
  async updatePredictions(orgId, teamId, predictions) {
    const response = await axios.put(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/predictions`,
      predictions
    );
    
    return response.data.data;
  },

  // Create milestone
  async createMilestone(orgId, teamId, priorityId, milestoneData) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones`,
      milestoneData
    );
    
    return response.data.data;
  },

  // Update milestone
  async updateMilestone(orgId, teamId, priorityId, milestoneId, updates) {
    try {
      const response = await axios.put(
        `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`,
        updates
      );
      
      return response.data.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Milestone ${milestoneId} not found:`, error.response.data);
        const customError = new Error(error.response.data.error || 'Milestone not found');
        customError.status = 404;
        customError.milestoneId = milestoneId;
        throw customError;
      }
      throw error;
    }
  },

  // Delete milestone
  async deleteMilestone(orgId, teamId, priorityId, milestoneId) {
    try {
      await axios.delete(
        `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`
      );
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Milestone ${milestoneId} not found for deletion:`, error.response.data);
        // Don't throw for 404 on delete - it's already gone
        return;
      }
      throw error;
    }
  },

  // Get archived priorities (all non-current quarters)
  async getArchivedPriorities(orgId, teamId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/archived`
    );
    
    return response.data.data;
  },

  // Add priority update
  async addPriorityUpdate(orgId, teamId, priorityId, updateText, statusChange) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates`,
      { updateText, statusChange }
    );
    
    return response.data.data;
  },
};