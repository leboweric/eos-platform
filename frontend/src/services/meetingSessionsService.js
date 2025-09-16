const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

class MeetingSessionsService {
  constructor() {
    this.sessionCache = null;
    this.autoSaveInterval = null;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Start a new meeting session or resume existing
  async startSession(orgId, teamId, meetingType = 'weekly') {
    try {
      console.log('Starting meeting session with:', {
        orgId,
        teamId,
        meetingType,
        url: `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/start`
      });

      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/start`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            organization_id: orgId,
            team_id: teamId,
            meeting_type: meetingType
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Session start failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to start session: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.sessionCache = data.session;
      this.startAutoSave(orgId, teamId);
      return data;
    } catch (error) {
      console.error('Error starting meeting session:', error);
      console.error('Error details:', {
        message: error.message,
        orgId,
        teamId,
        meetingType
      });
      throw error;
    }
  }

  // Get active session for a team
  async getActiveSession(orgId, teamId, meetingType = 'weekly') {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/active?team_id=${teamId}&meeting_type=${meetingType}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get active session: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.session) {
        this.sessionCache = data.session;
        this.startAutoSave(orgId, teamId);
      }
      return data.session;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  // Pause the current session
  async pauseSession(orgId, teamId, sessionId, reason = null) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/pause`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ reason })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to pause session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionCache = data.session;
      return data;
    } catch (error) {
      console.error('Error pausing session:', error);
      throw error;
    }
  }

  // Resume a paused session
  async resumeSession(orgId, teamId, sessionId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/resume`,
        {
          method: 'POST',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to resume session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionCache = data.session;
      return data;
    } catch (error) {
      console.error('Error resuming session:', error);
      throw error;
    }
  }

  // Get session status with pause history
  async getSessionStatus(orgId, teamId, sessionId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/status`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get session status: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionCache = data.session;
      return data;
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }

  // Update the current section
  async updateSection(orgId, teamId, sessionId, section) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/section`,
        {
          method: 'PATCH',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ section })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update section: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionCache = data.session;
      return data;
    } catch (error) {
      console.error('Error updating section:', error);
      throw error;
    }
  }

  // Save timer state (called periodically)
  async saveTimerState(orgId, teamId, sessionId, elapsedSeconds) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/save-state`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ elapsed_seconds: elapsedSeconds })
        }
      );

      if (!response.ok) {
        console.warn('Failed to save timer state:', response.statusText);
      }
    } catch (error) {
      console.warn('Error saving timer state:', error);
      // Don't throw - this is a background operation
    }
  }

  // End the meeting session
  async endSession(orgId, teamId, sessionId) {
    try {
      this.stopAutoSave();
      
      const response = await fetch(
        `${API_BASE_URL}/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/end`,
        {
          method: 'POST',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionCache = null;
      return data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  // Start auto-saving timer state
  startAutoSave(orgId, teamId) {
    this.stopAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(() => {
      if (this.sessionCache && !this.sessionCache.is_paused) {
        const elapsedSeconds = this.calculateElapsedSeconds();
        this.saveTimerState(orgId, teamId, this.sessionCache.id, elapsedSeconds);
      }
    }, 30000); // Save every 30 seconds
  }

  // Stop auto-saving
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Calculate elapsed seconds from session start
  calculateElapsedSeconds() {
    if (!this.sessionCache) return 0;
    
    const startTime = new Date(this.sessionCache.start_time).getTime();
    const now = Date.now();
    const totalElapsed = Math.floor((now - startTime) / 1000);
    
    // Subtract paused duration
    const pausedDuration = this.sessionCache.total_paused_duration || 0;
    
    // If currently paused, calculate additional pause time
    if (this.sessionCache.is_paused && this.sessionCache.last_pause_time) {
      const pauseStart = new Date(this.sessionCache.last_pause_time).getTime();
      const currentPauseDuration = Math.floor((now - pauseStart) / 1000);
      return totalElapsed - pausedDuration - currentPauseDuration;
    }
    
    return totalElapsed - pausedDuration;
  }

  // Get cached session
  getCachedSession() {
    return this.sessionCache;
  }

  // Clear session cache
  clearCache() {
    this.sessionCache = null;
    this.stopAutoSave();
  }
}

export default new MeetingSessionsService();