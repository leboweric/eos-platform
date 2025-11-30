import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  // Get user from Zustand store
  const user = useAuthStore.getState().user;

  // Get user's organization ID
  const orgId = user?.organizationId || user?.organization_id;

  return orgId;
};

const getTeamId = () => {
  const user = useAuthStore.getState().user;
  // First check for teams array and get the first team's ID
  if (user?.teams && user.teams.length > 0) {
    return user.teams[0].id;
  }
  // Fallback to teamId or team_id on user object
  return user?.teamId || user?.team_id || null;
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
  getIssues: async (timeline = null, includeArchived = false, departmentId = null) => {
    try {
      const orgId = getOrgId();

      const params = {};
      if (timeline) params.timeline = timeline;
      if (includeArchived) params.includeArchived = 'true';
      if (departmentId) params.department_id = departmentId;

      const response = await axios.get(
        `/organizations/${orgId}/issues`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get issues:', error);
      throw error;
    }
  },

  // Create a new issue
  createIssue: async (issueData) => {
    try {
      const orgId = getOrgId();
      const teamId = getTeamId();

      // Use department_id if provided, otherwise use teamId from issueData, otherwise use user's teamId
      const finalTeamId = issueData.department_id || issueData.teamId || issueData.team_id || teamId || null;

      // Remove the department_id and team_id fields as we'll use teamId
      const { department_id, team_id, ...cleanedData } = issueData;

      const response = await axios.post(
        `/organizations/${orgId}/issues`,
        {
          ...cleanedData,
          teamId: finalTeamId
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to create issue:', error);
      throw error;
    }
  },

  // Update an issue
  updateIssue: async (issueId, issueData) => {
    try {
      const orgId = getOrgId();

      const response = await axios.put(
        `/organizations/${orgId}/issues/${issueId}`,
        issueData
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to update issue:', error);
      throw error;
    }
  },

  // Delete an issue
  deleteIssue: async (issueId) => {
    try {
      const orgId = getOrgId();

      await axios.delete(
        `/organizations/${orgId}/issues/${issueId}`
      );
    } catch (error) {
      console.error('Failed to delete issue:', error);
      throw error;
    }
  },

  // Update issue priorities (for drag and drop reordering)
  updateIssuePriorities: async (updates) => {
    try {
      const orgId = getOrgId();

      await axios.put(
        `/organizations/${orgId}/issues/priorities`,
        { updates }
      );
    } catch (error) {
      console.error('Failed to update issue priorities:', error);
      throw error;
    }
  },

  // Get attachments for an issue
  getAttachments: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.get(
        `/organizations/${orgId}/issues/${issueId}/attachments`
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to get attachments:', error);
      throw error;
    }
  },

  // Upload attachment
  uploadAttachment: async (issueId, file) => {
    try {
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
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      throw error;
    }
  },

  // Download attachment
  downloadAttachment: async (issueId, attachmentId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.get(
        `/organizations/${orgId}/issues/${issueId}/attachments/${attachmentId}`,
        {
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to download attachment:', error);
      throw error;
    }
  },

  // Delete attachment
  deleteAttachment: async (issueId, attachmentId) => {
    try {
      const orgId = getOrgId();

      await axios.delete(
        `/organizations/${orgId}/issues/${issueId}/attachments/${attachmentId}`
      );
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      throw error;
    }
  },

  // Archive all closed issues
  archiveClosedIssues: async (timeline = null) => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/archive-closed`,
        { timeline }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to archive closed issues:', error);
      throw error;
    }
  },

  // Archive a single issue
  archiveIssue: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/archive`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to archive issue:', error);
      throw error;
    }
  },

  // Unarchive an issue
  unarchiveIssue: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/unarchive`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to unarchive issue:', error);
      throw error;
    }
  },

  // Vote for an issue
  voteForIssue: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/vote`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to vote for issue:', error);
      throw error;
    }
  },

  // Remove vote from an issue
  unvoteForIssue: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.delete(
        `/organizations/${orgId}/issues/${issueId}/vote`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to remove vote:', error);
      throw error;
    }
  },

  // Toggle vote for an issue (convenience function)
  toggleIssueVote: async (issueId, organizationId) => {
    try {
      const orgId = organizationId || getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/vote`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to toggle vote:', error);
      throw error;
    }
  },

  // Get user's votes
  getUserVotes: async () => {
    try {
      const orgId = getOrgId();

      const response = await axios.get(
        `/organizations/${orgId}/issues/votes`
      );
      return response.data.data.votedIssueIds;
    } catch (error) {
      console.error('Failed to get user votes:', error);
      throw error;
    }
  },

  // Move issue to another team
  moveIssueToTeam: async (issueId, newTeamId, reason = '') => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/move-team`,
        { newTeamId, reason }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to move issue:', error);
      throw error;
    }
  },

  // Get all updates for an issue
  getIssueUpdates: async (issueId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.get(
        `/organizations/${orgId}/issues/${issueId}/updates`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get issue updates:', error);
      throw error;
    }
  },

  // Add an update to an issue
  addIssueUpdate: async (issueId, updateText) => {
    try {
      const orgId = getOrgId();

      const response = await axios.post(
        `/organizations/${orgId}/issues/${issueId}/updates`,
        { update_text: updateText }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to add issue update:', error);
      throw error;
    }
  },

  // Delete an issue update
  deleteIssueUpdate: async (issueId, updateId) => {
    try {
      const orgId = getOrgId();

      const response = await axios.delete(
        `/organizations/${orgId}/issues/${issueId}/updates/${updateId}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete issue update:', error);
      throw error;
    }
  },

  // Update issue order (for drag-and-drop reordering)
  updateIssueOrder: async (orgId, teamId, updates) => {
    try {
      const response = await axios.put(
        `/organizations/${orgId}/teams/${teamId}/issues/reorder`,
        { issues: updates }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update issue order:', error);
      throw error;
    }
  }
};
