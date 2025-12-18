import axios from './axiosConfig';

/**
 * Quarterly priorities service for managing priority data
 * 
 * Priority objects now include team context fields:
 * - teamName: Name of the team that owns this priority
 * - isFromLeadership: Whether priority is from Leadership team
 * - isShared: Whether this priority is shared with the current team (read-only)
 */
export const quarterlyPrioritiesService = {
  // Get current priorities (simplified - no quarter logic)
  async getCurrentPriorities(orgId, teamId, departmentId = null) {
    let url = `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/current`;
    if (departmentId) {
      url += `?department_id=${departmentId}`;
    }
    const response = await axios.get(url);
    
    console.log('API Response:', response.data);
    
    // Ensure we always return the expected structure
    return {
      companyPriorities: response.data.data?.companyPriorities || [],
      teamMemberPriorities: response.data.data?.teamMemberPriorities || {},
      predictions: response.data.data?.predictions || {},
      teamMembers: response.data.data?.teamMembers || [],
      myMilestones: response.data.data?.myMilestones || [],
      sharedPriorities: response.data.data?.sharedPriorities || [] // NEW: Rocks shared with this team
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
      console.log('===========================================');
      console.log('[Service] Updating milestone:', {
        orgId,
        teamId,
        priorityId,
        milestoneId,
        updates
      });
      
      const response = await axios.put(
        `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`,
        updates
      );
      
      console.log('[Service] Milestone update response:', response.data);
      console.log('===========================================');
      
      return response.data.data;
    } catch (error) {
      console.error('[Service] Milestone update error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Delete milestone
  async deleteMilestone(orgId, teamId, priorityId, milestoneId) {
    await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`
    );
  },

  // Add priority update
  async addPriorityUpdate(orgId, teamId, priorityId, updateData) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates`,
      updateData
    );
    
    return response.data.data;
  },

  // Edit priority update
  async editPriorityUpdate(orgId, teamId, priorityId, updateId, updateData) {
    const response = await axios.put(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates/${updateId}`,
      updateData
    );
    
    return response.data.data;
  },

  // Delete priority update
  async deletePriorityUpdate(orgId, teamId, priorityId, updateId) {
    await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates/${updateId}`
    );
  },

  // Upload attachment
  async uploadAttachment(orgId, teamId, priorityId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data.data;
  },

  // Get attachments
  async getAttachments(orgId, teamId, priorityId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments`
    );
    
    return response.data.data;
  },

  // Download attachment
  async downloadAttachment(orgId, teamId, priorityId, attachmentId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments/${attachmentId}/download`,
      {
        responseType: 'blob'
      }
    );
    
    return response.data;
  },

  // Delete attachment
  async deleteAttachment(orgId, teamId, priorityId, attachmentId) {
    await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments/${attachmentId}`
    );
  },

  // ============================================================================
  // SHARING FUNCTIONS
  // ============================================================================

  /**
   * Share a priority with other teams
   * @param {string} orgId - Organization ID
   * @param {string} teamId - Current team ID
   * @param {string} priorityId - Priority ID to share
   * @param {string[]} sharedWithTeamIds - Array of team IDs to share with
   */
  async sharePriority(orgId, teamId, priorityId, sharedWithTeamIds) {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/shares`,
      { sharedWithTeamIds }
    );
    
    return response.data.data;
  },

  /**
   * Get teams a priority is shared with
   * @param {string} orgId - Organization ID
   * @param {string} teamId - Current team ID
   * @param {string} priorityId - Priority ID
   */
  async getPriorityShares(orgId, teamId, priorityId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/shares`
    );
    
    return response.data.data;
  },

  /**
   * Get available teams for sharing (all teams except current team)
   * @param {string} orgId - Organization ID
   * @param {string} teamId - Current team ID
   */
  async getAvailableTeamsForSharing(orgId, teamId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/available-teams`
    );
    
    return response.data.data;
  }
};
