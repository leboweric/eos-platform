const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Conclude a meeting (FIXED: uses correct /meetings/conclude endpoint)
  concludeMeeting: async (orgId, teamId, sessionId, sendEmail = false, meetingData = null) => {
    console.log('🔍 [meetingsService] concludeMeeting called with:', { orgId, teamId, sessionId, sendEmail });
    
    if (!sessionId) {
      throw new Error('Meeting session ID is required to conclude meeting');
    }
    
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meetings/conclude`;
    console.log('🔍 [meetingsService] Using conclude endpoint:', url);
    
    const requestBody = { 
      sessionId,
      sendEmail 
    };
    
    // Add meeting data if provided
    if (meetingData) {
      requestBody.meetingData = meetingData;
      console.log('🔍 [meetingsService] Including meeting data in request');
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to conclude meeting');
    }

    return response.json();
  },
};