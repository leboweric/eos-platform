import axios from './axiosConfig';

const API_URL = '/api';

export const meetingsService = {
  // Get all meetings for an organization and team
  async getMeetings(organizationId, teamId) {
    const response = await axios.get(`${API_URL}/meetings`, {
      params: { organizationId, teamId }
    });
    return response.data;
  },

  // Get a single meeting
  async getMeeting(organizationId, teamId, meetingId) {
    const response = await axios.get(`${API_URL}/meetings/${meetingId}`, {
      params: { organizationId, teamId }
    });
    return response.data;
  },

  // Create a new meeting
  async createMeeting(organizationId, teamId, meetingData) {
    const response = await axios.post(`${API_URL}/meetings`, {
      ...meetingData,
      organizationId,
      teamId
    });
    return response.data;
  },

  // Update a meeting
  async updateMeeting(organizationId, teamId, meetingId, meetingData) {
    const response = await axios.put(`${API_URL}/meetings/${meetingId}`, {
      ...meetingData,
      organizationId,
      teamId
    });
    return response.data;
  },

  // Delete a meeting
  async deleteMeeting(organizationId, teamId, meetingId) {
    const response = await axios.delete(`${API_URL}/meetings/${meetingId}`, {
      params: { organizationId, teamId }
    });
    return response.data;
  },

  // Get meeting attendees
  async getMeetingAttendees(organizationId, teamId, meetingId) {
    const response = await axios.get(`${API_URL}/meetings/${meetingId}/attendees`, {
      params: { organizationId, teamId }
    });
    return response.data;
  },

  // Add attendee to meeting
  async addMeetingAttendee(organizationId, teamId, meetingId, userId) {
    const response = await axios.post(`${API_URL}/meetings/${meetingId}/attendees`, {
      userId,
      organizationId,
      teamId
    });
    return response.data;
  },

  // Remove attendee from meeting
  async removeMeetingAttendee(organizationId, teamId, meetingId, userId) {
    const response = await axios.delete(`${API_URL}/meetings/${meetingId}/attendees/${userId}`, {
      params: { organizationId, teamId }
    });
    return response.data;
  }
};