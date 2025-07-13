import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  // Get user from Zustand store
  const user = useAuthStore.getState().user;
  
  // Check for impersonated org ID first, then user's organization ID
  const orgId = localStorage.getItem('impersonatedOrgId') || user?.organizationId || user?.organization_id;
  
  return orgId;
};

const getTeamId = () => {
  const user = useAuthStore.getState().user;
  return user?.teamId;
};

/**
 * Issues service for managing issue data
 * 
 * Issue objects now include publishing fields:
 * - is_published_to_departments: boolean indicating if visible to non-leadership teams
 * - published_at: timestamp when published
 * - published_by: ID of user who published
 */
export const issuesService = {
  // Get all issues
  getIssues: async (timeline = null, includeArchived = false) => {
    const orgId = getOrgId();
    
    const params = {};
    if (timeline) params.timeline = timeline;
    if (includeArchived) params.includeArchived = 'true';
    
    const response = await axios.get(
      `/organizations/${orgId}/issues`,
      { params }
    );
    return response.data;
  },

  // Create a new issue
  createIssue: async (issueData) => {
    const orgId = getOrgId();
    const teamId = getTeamId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues`,
      {
        ...issueData,
        teamId: teamId || null
      }
    );
    return response.data.data;
  },

  // Update an issue
  updateIssue: async (issueId, issueData) => {
    const orgId = getOrgId();
    
    const response = await axios.put(
      `/organizations/${orgId}/issues/${issueId}`,
      issueData
    );
    return response.data.data;
  },

  // Delete an issue
  deleteIssue: async (issueId) => {
    const orgId = getOrgId();
    
    await axios.delete(
      `/organizations/${orgId}/issues/${issueId}`
    );
  },

  // Update issue priorities (for drag and drop reordering)
  updateIssuePriorities: async (updates) => {
    const orgId = getOrgId();
    
    await axios.put(
      `/organizations/${orgId}/issues/priorities`,
      { updates }
    );
  },

  // Get attachments for an issue
  getAttachments: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.get(
      `/organizations/${orgId}/issues/${issueId}/attachments`
    );
    return response.data.data;
  },

  // Upload attachment
  uploadAttachment: async (issueId, file) => {
    const orgId = getOrgId();
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data.data;
  },

  // Download attachment
  downloadAttachment: async (issueId, attachmentId) => {
    const orgId = getOrgId();
    
    const response = await axios.get(
      `/organizations/${orgId}/issues/${issueId}/attachments/${attachmentId}`,
      {
        responseType: 'blob'
      }
    );
    return response.data;
  },

  // Delete attachment
  deleteAttachment: async (issueId, attachmentId) => {
    const orgId = getOrgId();
    
    await axios.delete(
      `/organizations/${orgId}/issues/${issueId}/attachments/${attachmentId}`
    );
  },

  // Archive all closed issues
  archiveClosedIssues: async (timeline = null) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/archive-closed`,
      { timeline }
    );
    return response.data;
  },

  // Unarchive an issue
  unarchiveIssue: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/unarchive`
    );
    return response.data;
  },

  // Vote for an issue
  voteForIssue: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/vote`
    );
    return response.data;
  },

  // Remove vote from an issue
  unvoteForIssue: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.delete(
      `/organizations/${orgId}/issues/${issueId}/vote`
    );
    return response.data;
  },

  // Get user's votes
  getUserVotes: async () => {
    const orgId = getOrgId();
    
    const response = await axios.get(
      `/organizations/${orgId}/issues/votes`
    );
    return response.data.data.votedIssueIds;
  }
};