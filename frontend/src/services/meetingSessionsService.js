import axios from './axiosConfig';

class MeetingSessionsService {
  constructor() {
    this.sessionCache = null;
    this.autoSaveInterval = null;
  }

  // Start a new meeting session or resume existing
  async startSession(orgId, teamId, meetingType = 'weekly') {
    try {
      console.log('Starting meeting session with:', {
        orgId,
        teamId,
        meetingType,
        url: `/organizations/${orgId}/teams/${teamId}/meeting-sessions/start`
      });

      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/start`,
        {
          organization_id: orgId,
          team_id: teamId,
          meeting_type: meetingType
        }
      );

      this.sessionCache = response.data.session;
      this.startAutoSave(orgId, teamId);
      return response.data;
    } catch (error) {
      console.error('Error starting meeting session:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        orgId,
        teamId,
        meetingType
      });
      
      // Provide clearer error messages
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to start meetings for this team.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to start session');
      }
    }
  }

  // Get active session for a team
  async getActiveSession(orgId, teamId, meetingType = 'weekly') {
    try {
      const response = await axios.get(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/active`,
        {
          params: {
            team_id: teamId,
            meeting_type: meetingType
          }
        }
      );

      if (response.data.session) {
        this.sessionCache = response.data.session;
        this.startAutoSave(orgId, teamId);
      }
      return response.data.session;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  // Pause the current session
  async pauseSession(orgId, teamId, sessionId, reason = null) {
    console.log('🟦🟦🟦 PAUSE API CALL START 🟦🟦🟦');
    console.log('Request params:', { orgId, teamId, sessionId, reason });
    console.log('URL:', `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/pause`);
    
    try {
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/pause`,
        { reason }
      );

      console.log('✅ Pause API success:', response.data);
      this.sessionCache = response.data.session;
      return response.data;
    } catch (error) {
      console.error('❌❌ Error pausing session:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Full error:', { 
        message: error.message, 
        response: error.response?.data,
        status: error.response?.status 
      });
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Meeting session not found. Please refresh the page.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to pause session');
      }
    } finally {
      console.log('🟦🟦🟦 PAUSE API CALL END 🟦🟦🟦');
    }
  }

  // Resume a paused session
  async resumeSession(orgId, teamId, sessionId) {
    console.log('🟩🟩🟩 RESUME API CALL START 🟩🟩🟩');
    console.log('Request params:', { orgId, teamId, sessionId });
    console.log('URL:', `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/resume`);
    
    try {
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/resume`
      );

      console.log('✅ Resume API success:', response.data);
      this.sessionCache = response.data.session;
      return response.data;
    } catch (error) {
      console.error('❌❌ Error resuming session:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Full error:', { 
        message: error.message, 
        response: error.response?.data,
        status: error.response?.status 
      });
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 404) {
        throw new Error('Meeting session not found. Please refresh the page.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to resume session');
      }
    } finally {
      console.log('🟩🟩🟩 RESUME API CALL END 🟩🟩🟩');
    }
  }

  // Get session status with pause history
  async getSessionStatus(orgId, teamId, sessionId) {
    try {
      const response = await axios.get(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/status`
      );

      this.sessionCache = response.data.session;
      return response.data;
    } catch (error) {
      console.error('Error getting session status:', error);
      throw error;
    }
  }

  // Update the current section
  async updateSection(orgId, teamId, sessionId, section) {
    try {
      const response = await axios.patch(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/section`,
        { section }
      );

      this.sessionCache = response.data.session;
      return response.data;
    } catch (error) {
      console.error('Error updating section:', error);
      throw error;
    }
  }

  // Save timer state (called periodically)
  async saveTimerState(orgId, teamId, sessionId, elapsedSeconds) {
    try {
      await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/save-state`,
        { elapsed_seconds: elapsedSeconds }
      );
    } catch (error) {
      console.warn('Error saving timer state:', error);
      // Don't throw - this is a background operation
    }
  }

  // End the meeting session
  async endSession(orgId, teamId, sessionId) {
    try {
      this.stopAutoSave();
      
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/end`
      );

      this.sessionCache = null;
      return response.data;
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

  // Section timing methods (Phase 2)
  async startSection(orgId, teamId, sessionId, sectionId) {
    try {
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/sections/start`,
        { 
          session_id: sessionId,
          section_id: sectionId 
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error starting section:', error);
      throw error;
    }
  }

  async endSection(orgId, teamId, sessionId, sectionId) {
    try {
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/sections/end`,
        { 
          session_id: sessionId,
          section_id: sectionId 
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error ending section:', error);
      throw error;
    }
  }

  async updateSectionPause(orgId, teamId, sessionId, isPaused) {
    try {
      const response = await axios.post(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/${sessionId}/sections/pause-update`,
        { 
          session_id: sessionId,
          is_paused: isPaused 
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating section pause state:', error);
      throw error;
    }
  }

  async getSectionConfig(orgId, teamId) {
    try {
      const response = await axios.get(
        `/organizations/${orgId}/teams/${teamId}/meeting-sessions/config/${orgId}/${teamId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching section config:', error);
      throw error;
    }
  }
}

export default new MeetingSessionsService();