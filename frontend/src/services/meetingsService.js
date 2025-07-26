const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export const meetingsService = {
  // Conclude a meeting and send summary email
  concludeMeeting: async (meetingData) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${API_URL}/meetings/conclude`, {
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