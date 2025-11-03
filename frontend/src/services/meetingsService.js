const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Conclude a meeting (uses correct /meetings/conclude endpoint)
  concludeMeeting: async (orgId, teamId, sessionId, sendEmail = true, meetingData = null) => {
    console.log('🔍 [meetingsService] concludeMeeting called with:', { orgId, teamId, sessionId, sendEmail });
    console.log('🔍 [meetingsService] meetingData provided:', !!meetingData);
    
    if (!orgId || !teamId) {
      throw new Error('Organization ID and Team ID are required to conclude meeting');
    }
    
    if (!meetingData) {
      throw new Error('Meeting data is required to conclude meeting');
    }
    
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meetings/conclude`;
    console.log('🔍 [meetingsService] Using correct conclude endpoint:', url);
    
    // Prepare the request body with all meeting data
    const requestBody = {
      ...meetingData,
      sendEmail: sendEmail !== false // Default to true
    };
    
    // If sessionId is provided, include it as specificMeetingId
    if (sessionId) {
      requestBody.specificMeetingId = sessionId;
    }
    
    console.log('🔍 [meetingsService] Request body keys:', Object.keys(requestBody));
    
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

    const result = await response.json();
    
    // Also mark the session as inactive if sessionId provided
    if (sessionId) {
      try {
        const sessionUrl = `${API_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}`;
        await fetch(sessionUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: false }),
        });
        console.log('✅ [meetingsService] Session marked as inactive');
      } catch (sessionError) {
        console.warn('⚠️ [meetingsService] Failed to mark session as inactive:', sessionError);
        // Don't fail the whole conclude operation if session update fails
      }
    }

    return result;
  },
};