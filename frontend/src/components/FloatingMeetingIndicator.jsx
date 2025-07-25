import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';

const FloatingMeetingIndicator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [meetingState, setMeetingState] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Check for active meeting
    const checkMeeting = () => {
      const savedState = localStorage.getItem('activeMeetingState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setMeetingState(parsed);
      } else {
        setMeetingState(null);
      }
    };

    // Check immediately
    checkMeeting();

    // Check periodically for changes
    const interval = setInterval(checkMeeting, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update elapsed time
  useEffect(() => {
    if (!meetingState) return;

    const timer = setInterval(() => {
      const start = new Date(meetingState.startTime);
      const now = new Date();
      const elapsed = Math.floor((now - start) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [meetingState]);

  // Don't show on meeting pages
  const isOnMeetingPage = location.pathname.includes('/meetings/weekly-accountability');
  
  if (!meetingState || isOnMeetingPage) {
    return null;
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReturnToMeeting = () => {
    navigate(`/meetings/weekly-accountability/${meetingState.teamId}`);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-3 shadow-lg"
          title="Meeting in progress"
        >
          <Clock className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Meeting in Progress</h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 text-green-600 font-mono text-xl mb-3">
        <Clock className="h-5 w-5" />
        {formatTime(elapsedTime)}
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        Weekly Accountability Meeting
        {meetingState.activeSection && (
          <div className="text-xs mt-1">
            Current: {meetingState.activeSection.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
        )}
      </div>
      
      <Button
        onClick={handleReturnToMeeting}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        size="sm"
      >
        Return to Meeting
      </Button>
    </div>
  );
};

export default FloatingMeetingIndicator;