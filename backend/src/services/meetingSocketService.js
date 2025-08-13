// Meeting WebSocket Service - Handles real-time meeting features
// This is ADDITIVE - does not modify any existing functionality

import { Server as SocketIOServer } from 'socket.io';

// Feature flag - can be disabled instantly via environment variable
const ENABLE_MEETINGS = process.env.ENABLE_MEETINGS === 'true';

// In-memory storage for meetings (no database changes)
const meetings = new Map();
const userSocketMap = new Map();

class MeetingSocketService {
  constructor() {
    this.io = null;
  }

  initialize(server) {
    if (!ENABLE_MEETINGS) {
      console.log('🔴 Meeting mode disabled via feature flag');
      return;
    }

    console.log('🟢 Initializing meeting WebSocket service...');
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      },
      // Namespace to isolate meeting sockets from any future socket usage
      path: '/meeting-socket'
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id);

      // Handle joining a meeting
      socket.on('join-meeting', (data) => {
        const { meetingCode, userId, userName, isLeader } = data;
        
        if (!meetingCode) {
          socket.emit('error', { message: 'Meeting code required' });
          return;
        }

        // Create meeting if it doesn't exist
        if (!meetings.has(meetingCode)) {
          meetings.set(meetingCode, {
            code: meetingCode,
            leader: isLeader ? userId : null,
            participants: new Map(),
            currentRoute: '/',
            currentSection: null,
            scrollPosition: 0,
            createdAt: new Date()
          });
        }

        const meeting = meetings.get(meetingCode);
        
        // Add participant
        meeting.participants.set(userId, {
          id: userId,
          name: userName,
          socketId: socket.id,
          isFollowing: true,
          joinedAt: new Date()
        });

        // Track user's socket
        userSocketMap.set(socket.id, { userId, meetingCode });

        // Join socket room
        socket.join(meetingCode);

        // Send current state to joining user
        socket.emit('meeting-joined', {
          meeting: {
            code: meetingCode,
            leader: meeting.leader,
            currentRoute: meeting.currentRoute,
            currentSection: meeting.currentSection,
            scrollPosition: meeting.scrollPosition
          },
          participants: Array.from(meeting.participants.values())
        });

        // Notify others of new participant
        socket.to(meetingCode).emit('participant-joined', {
          participant: meeting.participants.get(userId)
        });

        console.log(`✅ ${userName} joined meeting ${meetingCode}`);
      });

      // Handle navigation events (leader only)
      socket.on('navigate', (data) => {
        const userInfo = userSocketMap.get(socket.id);
        if (!userInfo) return;

        const meeting = meetings.get(userInfo.meetingCode);
        if (!meeting) return;

        // Only leader can broadcast navigation
        if (meeting.leader !== userInfo.userId) {
          socket.emit('error', { message: 'Only leader can control navigation' });
          return;
        }

        // Update meeting state
        meeting.currentRoute = data.route;
        meeting.currentSection = data.section;
        meeting.scrollPosition = data.scrollPosition || 0;

        // Broadcast to all participants
        socket.to(userInfo.meetingCode).emit('navigation-update', {
          route: data.route,
          section: data.section,
          scrollPosition: data.scrollPosition
        });

        console.log(`📍 Leader navigated to ${data.route}`);
      });

      // Handle follow toggle
      socket.on('toggle-follow', (data) => {
        const userInfo = userSocketMap.get(socket.id);
        if (!userInfo) return;

        const meeting = meetings.get(userInfo.meetingCode);
        if (!meeting) return;

        const participant = meeting.participants.get(userInfo.userId);
        if (participant) {
          participant.isFollowing = data.isFollowing;
          
          // Notify others of follow status change
          socket.to(userInfo.meetingCode).emit('participant-follow-changed', {
            userId: userInfo.userId,
            isFollowing: data.isFollowing
          });
        }
      });

      // Handle leaving meeting
      socket.on('leave-meeting', () => {
        this.handleUserDisconnect(socket);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleUserDisconnect(socket);
      });
    });
  }

  handleUserDisconnect(socket) {
    const userInfo = userSocketMap.get(socket.id);
    if (!userInfo) return;

    const meeting = meetings.get(userInfo.meetingCode);
    if (!meeting) return;

    const participant = meeting.participants.get(userInfo.userId);
    const userName = participant ? participant.name : 'Unknown';

    // Remove participant
    meeting.participants.delete(userInfo.userId);
    userSocketMap.delete(socket.id);

    // Notify others
    socket.to(userInfo.meetingCode).emit('participant-left', {
      userId: userInfo.userId
    });

    console.log(`👋 ${userName} left meeting ${userInfo.meetingCode}`);

    // Clean up empty meetings
    if (meeting.participants.size === 0) {
      meetings.delete(userInfo.meetingCode);
      console.log(`🗑️ Meeting ${userInfo.meetingCode} ended (no participants)`);
    } else if (meeting.leader === userInfo.userId) {
      // Transfer leadership to next participant
      const nextParticipant = meeting.participants.values().next().value;
      if (nextParticipant) {
        meeting.leader = nextParticipant.id;
        this.io.to(userInfo.meetingCode).emit('leader-changed', {
          newLeader: nextParticipant.id
        });
        console.log(`👑 Leadership transferred to ${nextParticipant.name}`);
      }
    }
  }

  // Method to check if meetings are enabled
  static isEnabled() {
    return ENABLE_MEETINGS;
  }

  // Method to get meeting stats (for monitoring)
  getStats() {
    if (!ENABLE_MEETINGS) return null;
    
    return {
      enabled: true,
      activeMeetings: meetings.size,
      totalParticipants: Array.from(meetings.values()).reduce(
        (sum, meeting) => sum + meeting.participants.size, 0
      ),
      meetings: Array.from(meetings.entries()).map(([code, meeting]) => ({
        code,
        participantCount: meeting.participants.size,
        leader: meeting.leader,
        currentRoute: meeting.currentRoute
      }))
    };
  }
}

export default new MeetingSocketService();