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
            // Extract teamId from meeting code format: orgId-teamId-weekly-accountability
            // Format: 8-4-4-4-12-8-4-4-4-12-weekly-accountability (UUID-UUID-suffix)
            const teamId = this.extractTeamIdFromMeetingCode(meetingCode, 'weekly-accountability');
            initialRoute = `/meetings/weekly-accountability/${teamId}`;
          } else if (meetingCode.includes('-quarterly-planning')) {
            // Extract teamId from meeting code format: orgId-teamId-quarterly-planning
            const teamId = this.extractTeamIdFromMeetingCode(meetingCode, 'quarterly-planning');
            initialRoute = `/meetings/quarterly-planning/${teamId}`;
          }
          
          meetings.set(meetingCode, {
            code: meetingCode,
            leader: isLeader ? userId : null,
            participants: new Map(),
            ratings: new Map(),  // Initialize ratings Map
            currentRoute: initialRoute,
            currentSection: null,
            scrollPosition: 0,
            createdAt: new Date(),
            timerStartTime: null,
            timerPaused: false
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

        // Track user's socket with full user info
        userSocketMap.set(socket.id, { userId, userName, meetingCode });

        // Join socket room
        socket.join(meetingCode);

        // Send current state to joining user
        socket.emit('meeting-joined', {
          meeting: {
            code: meetingCode,
            leader: meeting.leader,
            currentRoute: meeting.currentRoute,
            currentSection: meeting.currentSection,
            scrollPosition: meeting.scrollPosition,
            timerStartTime: meeting.timerStartTime,
            timerPaused: meeting.timerPaused
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
                userId: p.id,  // Include userId field for consistency
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
      
      // Handle todo updates (completion, creation, deletion)
      socket.on('update-todo', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast todo update to all participants
        socket.to(meetingCode).emit('todo-update', data);
        
        console.log('✅ Broadcasting todo update to meeting:', meetingCode, 'action:', data.action);
      });
      
      // Handle issue creation/deletion
      socket.on('update-issue-list', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast issue list update to all participants
        socket.to(meetingCode).emit('issue-list-update', data);
        
        console.log('📝 Broadcasting issue list update to meeting:', meetingCode, 'action:', data.action);
      });
      
      // Handle meeting timer sync
      socket.on('sync-timer', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode, userId } = userData;
        const meeting = meetings.get(meetingCode);
        
        if (!meeting || meeting.leader !== userId) {
          socket.emit('error', { message: 'Only leader can control timer' });
          return;
        }
        
        // Store timer state in meeting object
        if (data.startTime !== undefined) {
          meeting.timerStartTime = data.startTime;
        }
        if (data.isPaused !== undefined) {
          meeting.timerPaused = data.isPaused;
        }
        
        // Broadcast timer state to all participants
        socket.to(meetingCode).emit('timer-update', data);
        
        console.log('⏱️ Broadcasting timer update to meeting:', meetingCode, 'timer state:', data);
      });
      
      // Handle meeting notes updates
      socket.on('update-notes', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Store notes in meeting object
        const meeting = meetings.get(meetingCode);
        if (meeting) {
          if (!meeting.notes) meeting.notes = {};
          meeting.notes[data.section] = data.content;
        }
        
        // Broadcast notes update to all participants
        socket.to(meetingCode).emit('notes-update', data);
        
        console.log('📝 Broadcasting notes update to meeting:', meetingCode, 'section:', data.section);
      });
      
      // Handle presenter claim
      socket.on('claim-presenter', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode, userId } = userData;
        const meeting = meetings.get(meetingCode);
        
        if (!meeting) return;
        
        // Update leader
        meeting.leader = userId;
        
        // Broadcast new presenter to all participants
        socket.to(meetingCode).emit('presenter-changed', {
          newPresenter: userId,
          presenterName: data.presenterName
        });
        
        console.log('👑 Presenter changed in meeting:', meetingCode, 'new presenter:', userId);
      });
      
      // Handle participant rating submission
      socket.on('submit-rating', (data) => {
        console.log('🎯 RATING SUBMISSION RECEIVED:', {
          socketId: socket.id,
          data,
          hasUserData: userSocketMap.has(socket.id),
          currentSocketRooms: Array.from(socket.rooms)
        });
        
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) {
          console.error('❌ No user data found for socket:', socket.id);
          console.log('📊 Current userSocketMap:', Array.from(userSocketMap.entries()));
          return;
        }
        
        const { meetingCode, userId: socketUserId } = userData;
        console.log('💾 BEFORE SAVE - userData:', userData);
        
        const meeting = meetings.get(meetingCode);
        console.log('💾 BEFORE SAVE - meeting.ratings:', meeting?.ratings ? Array.from(meeting.ratings.entries()) : 'No ratings Map yet');
        
        console.log('🔍 Meeting lookup:', {
          meetingCode,
          meetingExists: !!meeting,
          participants: meeting ? Array.from(meeting.participants.values()) : [],
          leader: meeting ? meeting.leader : null
        });
        
        if (!meeting) {
          console.error('❌ No meeting found for code:', meetingCode);
          return;
        }
        
        // Store the rating in the meeting object
        if (!meeting.ratings) {
          meeting.ratings = new Map();
        }
        
        // Use the userId from socket data as primary, fall back to provided data
        const ratingUserId = socketUserId || data.userId;
        const ratingUserName = userData.userName || data.userName;
        
        console.log('💾 Storing rating:', {
          ratingUserId,
          ratingUserName,
          rating: data.rating,
          socketUserId,
          dataUserId: data.userId
        });
        
        meeting.ratings.set(ratingUserId, {
          userId: ratingUserId,
          userName: ratingUserName,
          rating: data.rating,
          submittedAt: new Date()
        });
        
        console.log('💾 AFTER SAVE - meeting.ratings:', Array.from(meeting.ratings.entries()));
        console.log('💾 AFTER SAVE - meeting.ratings.size:', meeting.ratings.size);
        
        // Calculate average rating
        const allRatings = Array.from(meeting.ratings.values());
        console.log('📡 All ratings to broadcast:', allRatings);
        
        const averageRating = allRatings.length > 0 
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length 
          : 0;
        
        const broadcastData = {
          userId: ratingUserId,
          userName: ratingUserName,
          rating: data.rating,
          totalParticipants: meeting.participants.size,
          totalRatings: meeting.ratings.size,
          averageRating: averageRating.toFixed(1),
          allRatings: allRatings
        };
        
        console.log('📤 BROADCASTING RATING:', {
          to: meetingCode,
          data: broadcastData,
          socketsInRoom: this.io.sockets.adapter.rooms.get(meetingCode) ? 
            Array.from(this.io.sockets.adapter.rooms.get(meetingCode)) : [],
          socketIsInRoom: socket.rooms.has(meetingCode)
        });
        
        // Ensure socket is in room before broadcasting
        if (!socket.rooms.has(meetingCode)) {
          console.warn('⚠️ Socket not in room, joining now...');
          socket.join(meetingCode);
        }
        
        // Broadcast rating to all participants including sender
        this.io.to(meetingCode).emit('participant-rating', broadcastData);
        console.log('📡 Emitted to room:', meetingCode);
        
        // Also send directly back to sender to ensure they receive it
        socket.emit('participant-rating', broadcastData);
        console.log('📡 Emitted directly to sender');
        
        console.log('✅ Rating broadcast complete');
        console.log('📡 Final meeting.ratings:', Array.from(meeting.ratings.entries()));
      });
      
      // Handle request for current ratings (for newly joined participants)
      socket.on('request-ratings', () => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        const meeting = meetings.get(meetingCode);
        
        if (!meeting || !meeting.ratings) return;
        
        const allRatings = Array.from(meeting.ratings.values());
        const averageRating = allRatings.length > 0 
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length 
          : 0;
        
        socket.emit('current-ratings', {
          totalParticipants: meeting.participants.size,
          totalRatings: meeting.ratings.size,
          averageRating: averageRating.toFixed(1),
          allRatings: allRatings
        });
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

  // Extract teamId from meeting code that contains UUIDs with hyphens
  extractTeamIdFromMeetingCode(meetingCode, meetingType) {
    try {
      // Remove the meeting type suffix first
      const suffix = `-${meetingType}`;
      if (!meetingCode.endsWith(suffix)) {
        console.error('Meeting code does not end with expected suffix:', suffix);
        return null;
      }
      
      // Remove the suffix to get: orgId-teamId
      const withoutSuffix = meetingCode.slice(0, -suffix.length);
      
      // UUIDs are 36 characters long (8-4-4-4-12 format)
      // So we need to find where the first UUID ends and second begins
      // Expected format: orgId (36 chars) + '-' + teamId (36 chars)
      if (withoutSuffix.length !== 73) { // 36 + 1 + 36 = 73
        console.error('Unexpected meeting code format. Expected length 73, got:', withoutSuffix.length);
        return null;
      }
      
      // Extract teamId (last 36 characters)
      const teamId = withoutSuffix.slice(-36);
      
      // Validate it looks like a UUID (basic check)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(teamId)) {
        console.error('Extracted teamId does not match UUID pattern:', teamId);
        return null;
      }
      
      console.log(`✅ Extracted teamId from meeting code: ${teamId}`);
      return teamId;
    } catch (error) {
      console.error('Error extracting teamId from meeting code:', error);
      return null;
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
  
  // Method to get meeting ratings (for meeting conclusion)
  getMeetingRatings(meetingCode) {
    const meeting = meetings.get(meetingCode);
    
    if (!meeting || !meeting.ratings) {
      return {
        ratings: [],
        averageRating: 0,
        totalParticipants: 0,
        totalRatings: 0
      };
    }
    
    const allRatings = Array.from(meeting.ratings.values());
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length 
      : 0;
    
    return {
      ratings: allRatings,
      averageRating: averageRating.toFixed(1),
      totalParticipants: meeting.participants.size,
      totalRatings: meeting.ratings.size
    };
  }
  
  // Method to get meeting creator/facilitator
  getMeetingFacilitator(meetingCode) {
    const meeting = meetings.get(meetingCode);
    return meeting ? meeting.leader : null;
  }
}

export default new MeetingSocketService();