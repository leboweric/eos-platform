const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Conclude a meeting and send summary email
  concludeMeeting: async (orgId, teamId, meetingData) => {
    // DEBUG: Log the parameters being sent to the backend
    console.log('🐛 [meetingsService] concludeMeeting called with:', { orgId, teamId, meetingData });
    console.log('🐛 [meetingsService] teamId length:', teamId?.length);
    console.log('🐛 [meetingsService] teamId type:', typeof teamId);
    
    const token = localStorage.getItem('accessToken');
    const url = `${API_URL}/organizations/${orgId}/teams/${teamId}/meetings/conclude`;
    console.log('🐛 [meetingsService] Full URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(meetingData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to conclude meeting');
    }

    return response.json();
  },
};