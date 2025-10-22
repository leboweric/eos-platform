import api from './axiosConfig';
import { useAuthStore } from '../stores/authStore';

const getOrgId = () => {
  const user = useAuthStore.getState().user;
  return user?.organizationId || user?.organization_id;
};

export const aiMeetingService = {
  // Start AI transcription for a meeting
  async startTranscription(meetingId, consentUserIds = []) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.post(`/ai/organizations/${orgId}/meetings/${meetingId}/transcription/start`, {
      consent_user_ids: consentUserIds
    });
    return response.data;
  },

  // Stop AI transcription and trigger processing
  async stopTranscription(meetingId, finalTranscript, structuredTranscript) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.post(`/ai/organizations/${orgId}/meetings/${meetingId}/transcription/stop`, {
      final_transcript: finalTranscript,
      structured_transcript: structuredTranscript
    });
    return response.data;
  },

  // Get transcription status
  async getTranscriptionStatus(meetingId) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.get(`/ai/organizations/${orgId}/meetings/${meetingId}/transcription/status`);
    return response.data;
  },

  // Get full transcript
  async getTranscript(meetingId) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.get(`/ai/organizations/${orgId}/meetings/${meetingId}/transcript`);
    return response.data;
  },

  // Get AI-generated summary
  async getAISummary(meetingId) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.get(`/ai/organizations/${orgId}/meetings/${meetingId}/ai-summary`);
    return response.data;
  },

  // Create todos from AI-detected action items
  async createTodosFromAI(meetingId, actionItemIds) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.post(`/ai/organizations/${orgId}/meetings/${meetingId}/ai-summary/create-todos`, {
      action_item_ids: actionItemIds
    });
    return response.data;
  },

  // Create issues from AI-detected issues
  async createIssuesFromAI(meetingId, issueIds) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.post(`/ai/organizations/${orgId}/meetings/${meetingId}/ai-summary/create-issues`, {
      issue_ids: issueIds
    });
    return response.data;
  },

  // Download transcript
  async downloadTranscript(meetingId, format = 'txt') {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.get(`/ai/organizations/${orgId}/meetings/${meetingId}/transcript/download`, {
      params: { format },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `meeting_transcript.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Delete transcript
  async deleteTranscript(meetingId, hardDelete = false) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const response = await api.delete(`/ai/organizations/${orgId}/meetings/${meetingId}/transcript`, {
      data: { hard_delete: hardDelete }
    });
    return response.data;
  },

  // Search across transcripts
  async searchTranscripts(query, filters = {}) {
    const orgId = getOrgId();
    if (!orgId) {
      throw new Error('No organization selected');
    }
    
    const params = {
      q: query,
      ...filters
    };
    
    const response = await api.get(`/ai/organizations/${orgId}/transcripts/search`, { params });
    return response.data;
  }
};

export default aiMeetingService;