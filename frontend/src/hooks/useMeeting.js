import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

// Feature flag - must match backend
const ENABLE_MEETINGS = import.meta.env.VITE_ENABLE_MEETINGS === 'true';

const useMeeting = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [meetingCode, setMeetingCode] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isLeader, setIsLeader] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [currentLeader, setCurrentLeader] = useState(null);
  const [activeMeetings, setActiveMeetings] = useState({}); // Track all active meetings
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const navigationLock = useRef(false);
  const isFollowingRef = useRef(true);
  const isLeaderRef = useRef(false);
  
  // Keep refs in sync with state
  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);
  
  useEffect(() => {
    isLeaderRef.current = isLeader;
  }, [isLeader]);

  // Initialize socket connection
  useEffect(() => {
    if (!ENABLE_MEETINGS) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Remove /api/v1 from the URL for socket connection
    const socketUrl = apiUrl.replace('/api/v1', '');
    
    // Before connecting to WebSocket
    console.log('🔌 Attempting WebSocket connection:', {
      socketUrl,
      path: '/meeting-socket',
      meetingType: 'weekly-express',
      transports: ['websocket', 'polling']
    });
    
    const newSocket = io(socketUrl, {
      path: '/meeting-socket',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('📡 Connected to meeting server');
      console.log('📡 Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.error('📡 WebSocket disconnected:', reason);
      console.error('📡 Room:', meetingCode || 'No room joined');
      console.log('📡 Disconnected from meeting server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      console.error('❌ Room:', meetingCode || 'No room joined');
      console.error('❌ Error details:', error.message, error.description);
      console.error('📡 Socket connection error:', error.message);
      console.error('📡 Error type:', error.type);
    });

    // Handle meeting joined
    newSocket.on('meeting-joined', (data) => {
      console.log('✅ Successfully joined meeting:', data);
      setMeetingCode(data.meeting.code);
      setCurrentLeader(data.meeting.leader);
      setParticipants(data.participants);
      
      // Navigate to current location if following (but not if we're on annual planning)
      if (isFollowing && data.meeting.currentRoute && data.meeting.currentRoute !== location.pathname) {
        // Prevent automatic redirect away from annual planning meetings
        if (location.pathname.includes('/annual-planning/')) {
          console.log('🚫 Preventing auto-navigation away from annual planning meeting');
          return;
        }
        navigationLock.current = true;
        navigate(data.meeting.currentRoute);
      }
      
      // Sync timer state if meeting already started
      if (data.meeting.timerStartTime) {
        const timerEvent = new CustomEvent('meeting-timer-update', {
          detail: {
            startTime: data.meeting.timerStartTime,
            isPaused: data.meeting.timerPaused || false
          }
        });
        window.dispatchEvent(timerEvent);
      }
    });

    // Handle participant joined
    newSocket.on('participant-joined', (data) => {
      console.log('👤 Participant joined:', data.participant);
      setParticipants(prev => [...prev, data.participant]);
    });

    // Handle participant left
    newSocket.on('participant-left', (data) => {
      console.log('👋 Participant left:', data.userId);
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
    });

    // Handle navigation updates from leader
    newSocket.on('navigation-update', (data) => {
      console.log('📍 Navigation update received v2:', data);
      console.log('📍 Current isFollowing state:', isFollowingRef.current);
      console.log('📍 Current isLeader state:', isLeaderRef.current);
      console.log('📍 Navigation lock status:', navigationLock.current);
      
      // Only followers should respond to navigation updates
      if (isFollowingRef.current && !isLeaderRef.current && !navigationLock.current) {
        console.log('📍 Follower processing navigation update');
        
        // Only navigate to a different route if needed
        if (data.route && data.route !== window.location.pathname) {
          // Defensive check: Don't navigate to routes with null parameters
          if (data.route.includes('/null') || data.route.includes('/undefined')) {
            console.warn('🚫 Refusing to navigate to route with invalid parameter:', data.route);
            return;
          }
          // Prevent automatic redirect away from annual planning meetings
          if (window.location.pathname.includes('/annual-planning/')) {
            console.log('🚫 Preventing follower auto-navigation away from annual planning meeting');
            return;
          }
          console.log('📍 Navigating to new route:', data.route);
          navigationLock.current = true;
          navigate(data.route);
        }
        
        // Handle section changes or scrolling
        // Always process section changes, even without route change
        if (data.section) {
          setTimeout(() => {
            console.log('📍 Triggering section change to:', data.section);
            console.log('📍 Section start time:', data.sectionStartTime);
            // Try to trigger section change in the UI
            const sectionChangeEvent = new CustomEvent('meeting-section-change', { 
              detail: { 
                section: data.section,
                sectionStartTime: data.sectionStartTime
              } 
            });
            window.dispatchEvent(sectionChangeEvent);
            
            // Also try to scroll to the section
            const element = document.getElementById(data.section);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
            
            if (data.scrollPosition !== undefined) {
              window.scrollTo(0, data.scrollPosition);
            }
          }, 100);
        }
      } else {
        console.log('📍 Ignoring navigation update - isFollowing:', isFollowingRef.current, 'isLeader:', isLeaderRef.current);
      }
    });

    // Handle leader change
    newSocket.on('leader-changed', (data) => {
      console.log('👑 Leader changed to:', data.newLeader);
      setCurrentLeader(data.newLeader);
      setIsLeader(data.newLeader === user?.id);
    });

    // Handle participant follow status change
    newSocket.on('participant-follow-changed', (data) => {
      console.log('👀 Follow status changed:', data);
      setParticipants(prev => prev.map(p => 
        p.id === data.userId ? { ...p, isFollowing: data.isFollowing } : p
      ));
    });

    // Handle active meetings update (list of all meetings with participants)
    newSocket.on('active-meetings-update', (data) => {
      console.log('📊 Active meetings update received:', data);
      console.log('📊 Meetings data:', data.meetings);
      console.log('📊 Number of active meetings:', Object.keys(data.meetings || {}).length);
      setActiveMeetings(data.meetings || {});
    });

    // Request active meetings on connect
    newSocket.on('connect', () => {
      console.log('🔄 Requesting active meetings on connect');
      newSocket.emit('get-active-meetings');
    });

    // Handle issue vote updates from other participants
    newSocket.on('issue-vote-update', (data) => {
      console.log('📊 Received vote update:', data);
      // Dispatch custom event that the meeting page can listen to
      const voteEvent = new CustomEvent('meeting-vote-update', { 
        detail: data 
      });
      window.dispatchEvent(voteEvent);
    });
    
    // Handle issue status updates from other participants
    newSocket.on('issue-status-update', (data) => {
      console.log('📊 Received issue status update:', data);
      // Dispatch custom event that the meeting page can listen to
      const statusEvent = new CustomEvent('meeting-issue-update', { 
        detail: data 
      });
      window.dispatchEvent(statusEvent);
    });
    
    // Handle todo updates from other participants
    newSocket.on('todo-update', (data) => {
      console.log('✅ Received todo update:', data);
      const todoEvent = new CustomEvent('meeting-todo-update', { 
        detail: data 
      });
      window.dispatchEvent(todoEvent);
    });
    
    // Handle issue list updates (creation/deletion)
    newSocket.on('issue-list-update', (data) => {
      console.log('📝 Received issue list update:', data);
      const listEvent = new CustomEvent('meeting-issue-list-update', { 
        detail: data 
      });
      window.dispatchEvent(listEvent);
    });
    
    // Handle timer updates from leader
    newSocket.on('timer-update', (data) => {
      console.log('⏱️ Received timer update:', data);
      const timerEvent = new CustomEvent('meeting-timer-update', { 
        detail: data 
      });
      window.dispatchEvent(timerEvent);
    });
    
    // Handle notes updates from other participants
    newSocket.on('notes-update', (data) => {
      console.log('📝 Received notes update:', data);
      const notesEvent = new CustomEvent('meeting-notes-update', { 
        detail: data 
      });
      window.dispatchEvent(notesEvent);
    });
    
    // Handle presenter changes
    newSocket.on('presenter-changed', (data) => {
      console.log('👑 Presenter changed:', data);
      setCurrentLeader(data.newPresenter);
      setIsLeader(data.newPresenter === user?.id);
      const presenterEvent = new CustomEvent('meeting-presenter-changed', { 
        detail: data 
      });
      window.dispatchEvent(presenterEvent);
    });
    
    // Handle participant ratings
    newSocket.on('participant-rating', (data) => {
      console.log('⭐ Received participant rating:', data);
      const ratingEvent = new CustomEvent('meeting-rating-update', { 
        detail: data 
      });
      window.dispatchEvent(ratingEvent);
    });
    
    // Handle errors
    newSocket.on('error', (data) => {
      console.error('❌ Meeting error:', data.message);
    });

    // Handle real-time content broadcasts
    newSocket.on('issue-created', (data) => {
      console.log('📝 Issue created:', data.issue.title, 'by', data.createdBy);
      window.dispatchEvent(new CustomEvent('meeting-issue-created', { detail: data }));
    });

    newSocket.on('todo-created', (data) => {
      console.log('✅ Todo created:', data.todo.title, 'by', data.createdBy);
      window.dispatchEvent(new CustomEvent('meeting-todo-created', { detail: data }));
    });

    newSocket.on('headline-created', (data) => {
      console.log('📰 Headline created:', data.headline.text, 'by', data.createdBy);
      window.dispatchEvent(new CustomEvent('meeting-headline-created', { detail: data }));
    });

    setSocket(newSocket);
    
    // Set up periodic refresh of active meetings every 5 seconds
    const refreshInterval = setInterval(() => {
      if (newSocket.connected) {
        console.log('🔄 Refreshing active meetings list');
        newSocket.emit('get-active-meetings');
      }
    }, 5000);

    return () => {
      clearInterval(refreshInterval);
      newSocket.disconnect();
    };
  }, []);

  // Reset navigation lock after navigation
  useEffect(() => {
    if (navigationLock.current) {
      navigationLock.current = false;
    }
  }, [location]);

  // Broadcast navigation when leader navigates
  useEffect(() => {
    if (!socket || !isLeader || !meetingCode || navigationLock.current) return;

    const scrollPosition = window.scrollY;
    socket.emit('navigate', {
      route: location.pathname,
      section: null,
      scrollPosition
    });
  }, [location, socket, isLeader, meetingCode]);

  // Join meeting
  const joinMeeting = useCallback((code, asLeader = false) => {
    if (!socket) {
      console.error('❌ Cannot join meeting: Socket not connected');
      return;
    }
    if (!user) {
      console.error('❌ Cannot join meeting: User not authenticated');
      return;
    }

    // Extract meeting details from room code for logging
    const [orgId, teamId, meetingType] = code.split('-');
    
    // Before connecting to WebSocket
    console.log('🔌 Attempting WebSocket connection:', {
      room: code,
      meetingType: meetingType || 'weekly-express',
      orgId,
      teamId
    });

    console.log('🚀 Joining meeting:', code, 'as', asLeader ? 'leader' : 'participant');
    console.log('🚀 User info:', { id: user.id, name: `${user.firstName} ${user.lastName}` });
    console.log('🚀 Socket connected:', socket.connected);
    
    const meetingData = {
      meetingCode: code,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      isLeader: asLeader
    };
    
    console.log('🚀 Emitting join-meeting with data:', meetingData);
    socket.emit('join-meeting', meetingData);

    setIsLeader(asLeader);
    setIsFollowing(!asLeader);
  }, [socket, user]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    if (!socket) return;

    console.log('👋 Leaving meeting');
    socket.emit('leave-meeting');
    
    setMeetingCode(null);
    setParticipants([]);
    setIsLeader(false);
    setIsFollowing(true);
    setCurrentLeader(null);
    
    // Redirect to meetings page
    navigate('/meetings');
  }, [socket, navigate]);

  // Toggle follow mode
  const toggleFollow = useCallback(() => {
    if (!socket || isLeader) return;

    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    
    socket.emit('toggle-follow', {
      isFollowing: newFollowState
    });
  }, [socket, isLeader, isFollowing]);

  // Navigate to specific location (leader only)
  const navigateTo = useCallback((path, section = null) => {
    if (!isLeader || !socket || !meetingCode) return;

    if (path !== location.pathname) {
      navigationLock.current = true;
      navigate(path);
    }

    // Emit navigation event
    socket.emit('navigate', {
      route: path || location.pathname,
      section,
      scrollPosition: 0
    });
  }, [isLeader, socket, meetingCode, navigate, location]);
  
  // Navigate to section only (leader only)
  const navigateToSection = useCallback((section, sectionStartTime) => {
    if (!isLeader || !socket || !meetingCode) return;
    
    console.log('📍 Leader navigating to section:', section);
    console.log('📍 Section start time:', sectionStartTime);
    console.log('📍 Current location.pathname:', location.pathname);
    
    // Defensive check: Don't emit navigation with invalid routes
    if (location.pathname.includes('/null') || location.pathname.includes('/undefined')) {
      console.warn('🚫 Refusing to emit navigation with invalid route:', location.pathname);
      return;
    }
    
    socket.emit('navigate', {
      route: location.pathname,
      section,
      sectionStartTime,
      scrollPosition: window.scrollY
    });
  }, [isLeader, socket, meetingCode, location]);
  
  // Emit vote update to other meeting participants
  const broadcastVote = useCallback((issueId, voteCount, userHasVoted) => {
    if (!socket || !meetingCode) return;
    
    console.log('📊 Broadcasting vote for issue:', issueId);
    socket.emit('vote-issue', {
      issueId,
      voteCount,
      userHasVoted
    });
  }, [socket, meetingCode]);
  
  // Emit issue status update to other meeting participants  
  const broadcastIssueUpdate = useCallback((issueData) => {
    if (!socket || !meetingCode) return;
    
    console.log('📊 Broadcasting issue update:', issueData);
    socket.emit('update-issue-status', issueData);
  }, [socket, meetingCode]);
  
  // Broadcast todo updates
  const broadcastTodoUpdate = useCallback((todoData) => {
    if (!socket || !meetingCode) return;
    
    console.log('✅ Broadcasting todo update:', todoData);
    socket.emit('update-todo', todoData);
  }, [socket, meetingCode]);
  
  // Broadcast issue list changes
  const broadcastIssueListUpdate = useCallback((listData) => {
    if (!socket || !meetingCode) return;
    
    console.log('📝 Broadcasting issue list update:', listData);
    socket.emit('update-issue-list', listData);
  }, [socket, meetingCode]);
  
  // Sync timer (leader only)
  const syncTimer = useCallback((timerData) => {
    if (!socket || !meetingCode || !isLeaderRef.current) return;
    
    console.log('⏱️ Syncing timer:', timerData);
    socket.emit('sync-timer', timerData);
  }, [socket, meetingCode]);
  
  // Update notes
  const updateNotes = useCallback((notesData) => {
    if (!socket || !meetingCode) return;
    
    console.log('📝 Updating notes:', notesData);
    socket.emit('update-notes', notesData);
  }, [socket, meetingCode]);
  
  // Broadcast rating
  const broadcastRating = useCallback((ratingData) => {
    if (!socket || !meetingCode) {
      console.error('❌ Cannot broadcast rating - missing socket or meetingCode:', {
        hasSocket: !!socket,
        socketConnected: socket?.connected,
        meetingCode
      });
      return;
    }
    
    console.log('⭐ Broadcasting rating:', {
      ratingData,
      socketId: socket.id,
      socketConnected: socket.connected,
      meetingCode
    });
    
    socket.emit('submit-rating', {
      userId: ratingData.userId,
      userName: ratingData.userName,
      rating: ratingData.rating
    });
  }, [socket, meetingCode]);
  
  // Claim presenter role
  const claimPresenter = useCallback(() => {
    if (!socket || !meetingCode) return;
    
    console.log('👑 Claiming presenter role');
    socket.emit('claim-presenter', {
      presenterName: user ? `${user.firstName} ${user.lastName}` : 'Unknown'
    });
    setIsLeader(true);
    setCurrentLeader(user?.id);
  }, [socket, meetingCode, user]);

  return {
    // Connection status
    isEnabled: ENABLE_MEETINGS,
    isConnected,
    
    // Meeting state
    meetingCode,
    participants,
    isLeader,
    currentLeader,
    isFollowing,
    activeMeetings, // All active meetings with participant counts
    
    // Actions
    joinMeeting,
    leaveMeeting,
    toggleFollow,
    navigateTo,
    navigateToSection,
    broadcastVote,
    broadcastIssueUpdate,
    broadcastTodoUpdate,
    broadcastIssueListUpdate,
    broadcastRating,
    syncTimer,
    updateNotes,
    claimPresenter
  };
};

export default useMeeting;