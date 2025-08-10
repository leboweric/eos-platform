import axios from './axiosConfig';

/**
 * Quarterly priorities service for managing priority data
 * 
 * Priority objects now include team context fields:
 * - teamName: Name of the team that owns this priority
 * - isFromLeadership: Whether priority is from Leadership team
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
      console.log('===========================================');
      console.log('[SERVICE] updateMilestone CALLED');
      console.log('===========================================');
      console.log('[SERVICE] orgId:', orgId);
      console.log('[SERVICE] teamId:', teamId);
      console.log('[SERVICE] priorityId:', priorityId);
      console.log('[SERVICE] milestoneId:', milestoneId);
      console.log('[SERVICE] updates object:', JSON.stringify(updates, null, 2));
      console.log('[SERVICE] updates.ownerId:', updates.ownerId);
      console.log('[SERVICE] updates.ownerId type:', typeof updates.ownerId);
      
      const url = `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/milestones/${milestoneId}`;
      console.log('[SERVICE] API URL:', url);
      console.log('[SERVICE] Sending PUT request with body:', updates);
      
      const response = await axios.put(url, updates);
      
      console.log('[SERVICE] Response status:', response.status);
      console.log('[SERVICE] Response data:', JSON.stringify(response.data, null, 2));
      console.log('[SERVICE] Returned milestone owner_id:', response.data?.data?.owner_id);
      console.log('===========================================');
      console.log('[SERVICE] updateMilestone COMPLETE');
      console.log('===========================================');
      
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
    
    console.log('Add update response:', response.data);
    return response.data.data;
  },

  // Edit priority update
  async editPriorityUpdate(orgId, teamId, priorityId, updateId, updateText) {
    const response = await axios.put(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates/${updateId}`,
      { updateText }
    );
    
    return response.data.data;
  },

  // Delete priority update
  async deletePriorityUpdate(orgId, teamId, priorityId, updateId) {
    try {
      console.log('Deleting update with params:', { orgId, teamId, priorityId, updateId });
      const response = await axios.delete(
        `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/updates/${updateId}`
      );
      console.log('Delete response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete update error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Upload attachment for a priority
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

  // Get attachments for a priority
  async getAttachments(orgId, teamId, priorityId) {
    const response = await axios.get(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments`
    );
    
    return response.data.data;
  },

  // Delete an attachment
  async deleteAttachment(orgId, teamId, priorityId, attachmentId) {
    const response = await axios.delete(
      `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments/${attachmentId}`
    );
    
    return response.data;
  },

  // Download an attachment - matching Issues implementation which works
  async downloadAttachment(orgId, teamId, priorityId, attachmentId, fileName) {
    try {
      const response = await axios.get(
        `/organizations/${orgId}/teams/${teamId}/quarterly-priorities/priorities/${priorityId}/attachments/${attachmentId}/download`,
        {
          responseType: 'blob'
        }
      );
      
      // Create a download link directly from the blob - matching Issues
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
};