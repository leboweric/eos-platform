import axios from './axiosConfig';
import { useAuthStore } from '../stores/authStore';
import { logTransfer, summarizeText } from '../utils/transferDebug';

const getOrgId = () => {
  // Get user from Zustand store
  const user = useAuthStore.getState().user;
  
  // Get user's organization ID
  const orgId = user?.organizationId || user?.organization_id;
  
  return orgId;
};

const getTeamId = () => {
  const user = useAuthStore.getState().user;
  // Prefer leadership when dual-membered so create fallbacks never pick Delivery
  if (user?.teams && user.teams.length > 0) {
    const leadershipTeam = user.teams.find((team) => team.is_leadership_team);
    if (leadershipTeam) return leadershipTeam.id;
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
  },

  // Create a new issue
  createIssue: async (issueData) => {
    const orgId = getOrgId();
    const teamId = getTeamId();
    
    // Use department_id if provided, otherwise use teamId from issueData, otherwise use user's teamId
    const finalTeamId = issueData.department_id || issueData.teamId || issueData.team_id || teamId || null;

    const requestBody = {
      title: issueData.title,
      description: typeof issueData.description === 'string' ? issueData.description : (issueData.description ?? ''),
      ownerId: issueData.ownerId ?? null,
      timeline: issueData.timeline || 'short_term',
      status: issueData.status || 'open',
      teamId: finalTeamId,
      related_todo_id: issueData.related_todo_id || null,
      related_headline_id: issueData.related_headline_id || null,
      related_priority_id: issueData.related_priority_id || null,
      priority_level: issueData.priority_level || null,
      meeting_id: issueData.meeting_id || null,
      ...(issueData.transferSourceTeamId || issueData.transferReason ? {
        transferSourceTeamId: issueData.transferSourceTeamId || null,
        transferReason: issueData.transferReason || ''
      } : {})
    };

    if (issueData.transferSourceTeamId || issueData.transferReason) {
      logTransfer('issue:api-create-request', {
        teamId: requestBody.teamId,
        descriptionLen: summarizeText(requestBody.description).chars,
        transferSourceTeamId: requestBody.transferSourceTeamId || null,
        transferReasonLen: (requestBody.transferReason || '').length
      });
    }

    const response = await axios.post(
      `/organizations/${orgId}/issues`,
      requestBody
    );
    return response.data.data;
  },

  // Update an issue
  updateIssue: async (issueId, issueData) => {
    const orgId = getOrgId();

    const {
      transferToTeam: _transferToTeam,
      pendingUpdateText: _pendingUpdateText,
      sourceContextTeamId: _sourceContextTeamId,
      department_id: _department_id,
      team_id: _team_id,
      teamId: _teamId,
      id: _id,
      ownerName: _ownerName,
      ...updatePayload
    } = issueData;
    
    const response = await axios.put(
      `/organizations/${orgId}/issues/${issueId}`,
      updatePayload
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

  // Archive a single issue
  archiveIssue: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/archive`
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

  // Toggle vote for an issue (convenience function)
  toggleIssueVote: async (issueId, organizationId) => {
    const orgId = organizationId || getOrgId();
    
    const response = await axios.post(
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
  },

  // Move issue to another team (optionally reassign owner)
  moveIssueToTeam: async (issueId, moveData, reason = '', newOwnerId = null) => {
    const orgId = getOrgId();
    const payload = typeof moveData === 'object' && moveData !== null && 'newTeamId' in moveData
      ? moveData
      : { newTeamId: moveData, reason, newOwnerId };

    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/move-team`,
      payload
    );
    return response.data;
  },

  // Get all updates for an issue
  getIssueUpdates: async (issueId) => {
    const orgId = getOrgId();
    
    const response = await axios.get(
      `/organizations/${orgId}/issues/${issueId}/updates`
    );
    return response.data;
  },

  // Add an update to an issue
  addIssueUpdate: async (issueId, updateText) => {
    const orgId = getOrgId();
    
    const response = await axios.post(
      `/organizations/${orgId}/issues/${issueId}/updates`,
      { update_text: updateText }
    );
    return response.data;
  },

  // Delete an issue update
  deleteIssueUpdate: async (issueId, updateId) => {
    const orgId = getOrgId();
    
    const response = await axios.delete(
      `/organizations/${orgId}/issues/${issueId}/updates/${updateId}`
    );
    return response.data;
  },

  // Update issue order (for drag-and-drop reordering)
  updateIssueOrder: async (orgId, teamId, updates) => {
    const response = await axios.post(
      `/organizations/${orgId}/teams/${teamId}/issues/reorder`,
      { issues: updates }
    );
    return response.data;
  }
};