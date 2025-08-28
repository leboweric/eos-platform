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
          // Determine initial route based on meeting type
          let initialRoute = '/';
          if (meetingCode.includes('-weekly-accountability')) {
            const teamId = meetingCode.replace('-weekly-accountability', '');
            initialRoute = `/meetings/weekly-accountability/${teamId}`;
          } else if (meetingCode.includes('-quarterly-planning')) {
            const teamId = meetingCode.replace('-quarterly-planning', '');
            initialRoute = `/meetings/quarterly-planning/${teamId}`;
          }
          
          meetings.set(meetingCode, {
            code: meetingCode,
            leader: isLeader ? userId : null,
            participants: new Map(),
            currentRoute: initialRoute,
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

        // Broadcast updated active meetings to all connected clients
        this.broadcastActiveMeetings();

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

        console.log(`📍 Leader ${userInfo.userId} navigated to route: ${data.route}, section: ${data.section || 'none'}`);
        console.log(`📍 Broadcasting to meeting: ${userInfo.meetingCode}`);
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

      // Handle request for active meetings
      socket.on('get-active-meetings', () => {
        const activeMeetings = {};
        meetings.forEach((meeting, code) => {
          if (meeting.participants.size > 0) {
            // Parse the meeting code to get team and type
            const [teamId, meetingType] = code.split('-').reduce((acc, part, index, arr) => {
              if (index < arr.length - 2) {
                acc[0] = acc[0] ? `${acc[0]}-${part}` : part;
              } else {
                acc[1] = acc[1] ? `${acc[1]}-${part}` : part;
              }
              return acc;
            }, ['', '']);
            
            activeMeetings[code] = {
              code,
              teamId,
              meetingType,
              participantCount: meeting.participants.size,
              participants: Array.from(meeting.participants.values()).map(p => ({
                id: p.id,
                name: p.name
              })),
              leader: meeting.leader,
              startedAt: meeting.createdAt
            };
          }
        });
        
        socket.emit('active-meetings-update', { meetings: activeMeetings });
      });

      // Handle leaving meeting
      socket.on('leave-meeting', () => {
        this.handleUserDisconnect(socket);
      });

      // Handle issue voting
      socket.on('vote-issue', (data) => {
        const { issueId, voteCount, userHasVoted } = data;
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast vote update to all participants in the meeting
        socket.to(meetingCode).emit('issue-vote-update', {
          issueId,
          voteCount,
          voterId: userData.userId,
          userHasVoted
        });
        
        console.log('📊 Broadcasting vote update for issue:', issueId, 'to meeting:', meetingCode);
      });
      
      // Handle issue status changes
      socket.on('update-issue-status', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast issue status update to all participants
        socket.to(meetingCode).emit('issue-status-update', data);
        
        console.log('📊 Broadcasting issue status update to meeting:', meetingCode);
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleUserDisconnect(socket);
      });
    });
  }

  broadcastActiveMeetings() {
    const activeMeetings = {};
    meetings.forEach((meeting, code) => {
      if (meeting.participants.size > 0) {
        // Parse the meeting code to get team and type
        const lastDashIndex = code.lastIndexOf('-');
        const teamId = code.substring(0, lastDashIndex);
        const meetingType = code.substring(lastDashIndex + 1);
        
        activeMeetings[code] = {
          code,
          teamId,
          meetingType,
          participantCount: meeting.participants.size,
          participants: Array.from(meeting.participants.values()).map(p => ({
            id: p.id,
            name: p.name
          })),
          leader: meeting.leader,
          startedAt: meeting.createdAt
        };
      }
    });
    
    // Broadcast to all connected clients
    this.io.emit('active-meetings-update', { meetings: activeMeetings });
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
    
    // Broadcast updated active meetings to all connected clients
    this.broadcastActiveMeetings();

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