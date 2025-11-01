const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Conclude a meeting session (FIXED: now uses meeting-sessions endpoint)
  concludeMeeting: async (orgId, teamId, sessionId, sendEmail = false, meetingData = null) => {
    // DEBUG: Log the parameters being sent to the backend
    console.log('🔍 [meetingsService] concludeMeeting called with:', { orgId, teamId, sessionId, sendEmail });
    console.log('🔍 [meetingsService] sessionId:', sessionId);
    console.log('🔍 [meetingsService] sessionId type:', typeof sessionId);
    console.log('🔍 [meetingsService] meetingData provided:', !!meetingData);
    
    if (!sessionId) {
      throw new Error('Meeting session ID is required to conclude meeting');
    }
    
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}`;
    console.log('🔍 [meetingsService] NEW Fixed URL:', url);
    
    const requestBody = { 
      is_active: false,  // Mark session as inactive
      sendEmail 
    };
    
    // Add meeting data if provided
    if (meetingData) {
      requestBody.meetingData = meetingData;
      console.log('🔍 [meetingsService] Including meeting data in request');
    }
    
    const response = await fetch(url, {
      method: 'PUT', // Changed from POST to PUT
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to conclude meeting session');
    }

    return response.json();
  },
};