import { useState, useEffect } from 'react';

const MEETING_STATE_KEY = 'activeMeetingState';

export const useMeetingState = (meetingType, teamId) => {
  const [meetingState, setMeetingState] = useState(null);

  // Load saved state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(MEETING_STATE_KEY);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      // Only restore if it's the same meeting type and team
      if (parsed.type === meetingType && parsed.teamId === teamId) {
        setMeetingState(parsed);
      }
    }
  }, [meetingType, teamId]);

  // Save state whenever it changes
  const updateMeetingState = (updates) => {
    const newState = meetingState ? { ...meetingState, ...updates } : updates;
    setMeetingState(newState);
    localStorage.setItem(MEETING_STATE_KEY, JSON.stringify(newState));
  };

  const startMeeting = (initialState) => {
    const state = {
      type: meetingType,
      teamId,
      startTime: new Date().toISOString(),
      ...initialState
    };
    updateMeetingState(state);
  };

  const endMeeting = () => {
    setMeetingState(null);
    localStorage.removeItem(MEETING_STATE_KEY);
  };

  const getActiveMeeting = () => {
    const savedState = localStorage.getItem(MEETING_STATE_KEY);
    return savedState ? JSON.parse(savedState) : null;
  };

  return {
    meetingState,
    startMeeting,
    endMeeting,
    updateMeetingState,
    getActiveMeeting,
    isInMeeting: !!meetingState
  };
};