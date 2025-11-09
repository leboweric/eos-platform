import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Users,
  UserCheck,
  UserX,
  Crown,
  Eye,
  EyeOff,
  Video,
  VideoOff,
  X,
  Clock
} from 'lucide-react';
import useMeeting from '../../hooks/useMeeting';

const MeetingBar = ({ 
  meetingCode,
  participants,
  onLeave,
  isLeader,
  currentLeader,
  onNavigate,
  meetingStartTime, 
  meetingStarted 
}) => {
  const {
    isEnabled,
    isConnected,
    isFollowing,
    toggleFollow
  } = useMeeting();
  
  // Use onLeave prop as leaveMeeting function
  const leaveMeeting = onLeave;

  console.log('🟢 MeetingBar Component Render:', {
    isEnabled,
    isConnected,
    meetingCode,
    participantsCount: participants?.length,
    isLeader,
    currentLeader,
    meetingStartTime,
    meetingStarted
  });

  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinAsLeader, setJoinAsLeader] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update timer
  useEffect(() => {
    let timer;
    if (meetingStarted && meetingStartTime) {
      timer = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - meetingStartTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [meetingStarted, meetingStartTime]);

  // Format elapsed time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Don't render if feature is disabled
  if (!isEnabled) {
    console.log('❌ MeetingBar: Feature disabled (isEnabled=false)');
    return null;
  }

  const handleJoinMeeting = () => {
    if (joinCode.trim()) {
      joinMeeting(joinCode.trim(), joinAsLeader);
      setShowJoinDialog(false);
      setJoinCode('');
      setJoinAsLeader(false);
    }
  };

  const handleCreateMeeting = () => {
    // Generate a random meeting code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinMeeting(code, true);
    setShowJoinDialog(false);
  };

  // Not in a meeting - don't show anything
  if (!meetingCode) {
    console.log('❌ MeetingBar: No meeting code');
    return null;
  }

  console.log('✅ MeetingBar: Rendering bar with', participants?.length, 'participants');

  // In a meeting - show meeting bar
  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 transition-all duration-300 ${
      isExpanded ? 'h-20' : 'h-12'
    }`}>
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side - Meeting info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-green-600" />
            <span className="font-medium">Meeting: {meetingCode}</span>
          </div>

          {isExpanded && (
            <>
              <div className="h-6 w-px bg-gray-300" />
              
              {/* Timer */}
              {meetingStarted && meetingStartTime && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-300" />
                </>
              )}
              
              {/* Participants */}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Participant avatars */}
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((participant) => (
                  <div
                    key={participant.id}
                    className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center relative"
                    title={`${participant.name}${participant.id === currentLeader ? ' (Leader)' : ''}${participant.isFollowing ? ' - Following' : ' - Not following'}`}
                  >
                    <span className="text-xs font-medium">
                      {participant.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    {participant.id === currentLeader && (
                      <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                    )}
                    {!participant.isFollowing && (
                      <EyeOff className="absolute -bottom-1 -right-1 h-3 w-3 text-gray-400" />
                    )}
                  </div>
                ))}
                {participants.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-medium">+{participants.length - 5}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2">
          {isExpanded && (
            <>
              {/* Follow toggle (only for non-leaders) */}
              {!isLeader && (
                <Button
                  onClick={toggleFollow}
                  variant={isFollowing ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {isFollowing ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Following Leader
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Not Following
                    </>
                  )}
                </Button>
              )}

              {/* Leader indicator */}
              {isLeader && (
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm font-medium">You're Leading</span>
                </div>
              )}

              {/* Leave meeting */}
              <Button
                onClick={leaveMeeting}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <VideoOff className="h-4 w-4" />
                Leave Meeting
              </Button>
            </>
          )}

          {/* Expand/Collapse toggle */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="p-1"
          >
            {isExpanded ? (
              <X className="h-4 w-4" />
            ) : (
              <Users className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeetingBar;