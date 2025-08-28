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
    console.log('🔌 Connecting to socket server:', socketUrl);
    const newSocket = io(socketUrl, {
      path: '/meeting-socket',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('📡 Connected to meeting server');
      console.log('📡 Socket ID:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('📡 Disconnected from meeting server:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('📡 Socket connection error:', error.message);
      console.error('📡 Error type:', error.type);
    });

    // Handle meeting joined
    newSocket.on('meeting-joined', (data) => {
      console.log('✅ Successfully joined meeting:', data);
      setMeetingCode(data.meeting.code);
      setCurrentLeader(data.meeting.leader);
      setParticipants(data.participants);
      
      // Navigate to current location if following
      if (isFollowing && data.meeting.currentRoute && data.meeting.currentRoute !== location.pathname) {
        navigationLock.current = true;
        navigate(data.meeting.currentRoute);
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
      console.log('📍 Navigation update received:', data);
      console.log('📍 Current isFollowing state:', isFollowingRef.current);
      console.log('📍 Current isLeader state:', isLeaderRef.current);
      
      // Only followers should respond to navigation updates
      if (isFollowingRef.current && !isLeaderRef.current && !navigationLock.current) {
        console.log('📍 Follower processing navigation update');
        
        // Only navigate to a different route if needed
        if (data.route && data.route !== window.location.pathname) {
          console.log('📍 Navigating to new route:', data.route);
          navigationLock.current = true;
          navigate(data.route);
        }
        
        // Handle section changes or scrolling
        setTimeout(() => {
          if (data.scrollPosition !== undefined) {
            window.scrollTo(0, data.scrollPosition);
          }
          if (data.section) {
            console.log('📍 Triggering section change to:', data.section);
            // Try to trigger section change in the UI
            const sectionChangeEvent = new CustomEvent('meeting-section-change', { 
              detail: { section: data.section } 
            });
            window.dispatchEvent(sectionChangeEvent);
            
            // Also try to scroll to the section
            const element = document.getElementById(data.section);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 100);
      } else {
        console.log('📍 Ignoring navigation update (leader or not following)');
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

    // Handle errors
    newSocket.on('error', (data) => {
      console.error('❌ Meeting error:', data.message);
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
  }, [socket]);

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
  const navigateToSection = useCallback((section) => {
    if (!isLeader || !socket || !meetingCode) return;
    
    console.log('📍 Leader navigating to section:', section);
    socket.emit('navigate', {
      route: location.pathname,
      section,
      scrollPosition: window.scrollY
    });
  }, [isLeader, socket, meetingCode, location]);

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
    navigateToSection
  };
};

export default useMeeting;