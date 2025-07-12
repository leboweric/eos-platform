import axios from 'axios';

const getOrgId = () => {
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  return localStorage.getItem('impersonatedOrgId') || user?.organizationId;
};

const getTeamId = () => {
  const authState = JSON.parse(localStorage.getItem('auth-store') || '{}');
  const user = authState?.state?.user;
  return user?.teamId;
};

export const issuesService = {
  // Get all issues
  getIssues: async (timeline = null) => {
    const orgId = getOrgId();
    
    const params = timeline ? { timeline } : {};
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
  }
};