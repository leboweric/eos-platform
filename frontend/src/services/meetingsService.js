const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Create a new meeting record in the database
  createMeeting: async (orgId, teamId, meetingType, title = null) => {
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meetings`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        meetingType,
        title: title || `${meetingType} Meeting`,
        scheduledDate: new Date().toISOString()
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create meeting');
    }
    
    return await response.json();
  },

  // Conclude a meeting (uses correct /meetings/conclude endpoint)
  concludeMeeting: async (orgId, teamId, sessionId, sendEmail = true, meetingData = null) => {
    console.log('🟢 [Service 1] concludeMeeting called', {
      orgId,
      teamId,
      sessionId,
      sendEmail,
      hasMeetingData: !!meetingData,
      timestamp: new Date().toISOString()
    });
    
    console.log('🟢 [Service 2] Validating required parameters');
    if (!orgId || !teamId) {
      console.error('🔴 [Service ERROR] Missing orgId or teamId', { orgId, teamId });
      throw new Error('Organization ID and Team ID are required to conclude meeting');
    }
    
    if (!meetingData) {
      console.error('🔴 [Service ERROR] No meeting data provided');
      throw new Error('Meeting data is required to conclude meeting');
    }
    
    console.log('🟢 [Service 3] Getting auth token');
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('🔴 [Service ERROR] No auth token found');
      throw new Error('Authentication token not found');
    }
    console.log('🟢 [Service 4] Auth token exists:', !!token);
    
    console.log('🟢 [Service 5] Building request URL');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meetings/conclude`;
    console.log('🟢 [Service 6] URL:', url);
    console.log('🟢 [Service 7] API_URL:', API_URL);
    
    console.log('🟢 [Service 8] Building request body');
    const requestBody = {
      ...meetingData,
      sendEmail: sendEmail !== false // Default to true
    };
    
    console.log('🟢 [Service 9] Request body keys:', Object.keys(requestBody));
    console.log('🟢 [Service 10] Request body size:', JSON.stringify(requestBody).length, 'characters');
    
    console.log('🟢 [Service 11] About to fetch - making HTTP request');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('🟢 [Service 12] Fetch complete', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      console.error('🔴 [Service ERROR] Response not OK', {
        status: response.status,
        statusText: response.statusText
      });
      try {
        const error = await response.json();
        console.error('🔴 [Service ERROR] Error response body:', error);
        throw new Error(error.message || 'Failed to conclude meeting');
      } catch (parseError) {
        console.error('🔴 [Service ERROR] Failed to parse error response:', parseError);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    console.log('🟢 [Service 13] Parsing response');
    const result = await response.json();
    console.log('🟢 [Service 14] Response parsed successfully:', result);
    
    console.log('🟢 [Service 15] Processing session update if sessionId provided');
    // Also mark the session as inactive if sessionId provided
    if (sessionId) {
      console.log('🟢 [Service 16] SessionId provided, updating session status');
      try {
        const sessionUrl = `${API_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}`;
        console.log('🟢 [Service 17] Session update URL:', sessionUrl);
        
        const sessionResponse = await fetch(sessionUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ is_active: false }),
        });
        
        console.log('🟢 [Service 18] Session update response:', {
          status: sessionResponse.status,
          ok: sessionResponse.ok
        });
        
        if (sessionResponse.ok) {
          console.log('✅ [Service 19] Session marked as inactive successfully');
        } else {
          console.warn('⚠️ [Service 19] Session update returned non-OK status');
        }
      } catch (sessionError) {
        console.warn('⚠️ [Service ERROR] Failed to mark session as inactive:', sessionError);
        // Don't fail the whole conclude operation if session update fails
      }
    } else {
      console.log('🟢 [Service 16] No sessionId provided, skipping session update');
    }

    console.log('🟢 [Service 20] Returning result to caller');
    return result;
  },
};