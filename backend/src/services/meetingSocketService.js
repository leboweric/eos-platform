// Meeting WebSocket Service - Handles real-time meeting features
// This is ADDITIVE - does not modify any existing functionality

import { Server as SocketIOServer } from 'socket.io';
import transcriptionService from './transcriptionService.js';
import aiSummaryService from './aiSummaryService.js';

// Feature flag - can be disabled instantly via environment variable
const ENABLE_MEETINGS = process.env.ENABLE_MEETINGS === 'true';

// In-memory storage for meetings (no database changes)
const meetings = new Map();
const userSocketMap = new Map();

// Track temporarily disconnected users for reconnection grace period
// Key: `${meetingCode}:${userId}`, Value: { userId, userName, wasLeader, disconnectedAt, timeoutId }
const disconnectedUsers = new Map();

// Grace period in milliseconds before fully removing a disconnected user
const DISCONNECT_GRACE_PERIOD_MS = 45000; // 45 seconds

class MeetingSocketService {
  constructor() {
    this.io = null;
  }

  initialize(server) {
    if (!ENABLE_MEETINGS) {
      console.log('🔴 Meeting mode disabled via feature flag');
      return;
    }

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('🟢 Initializing meeting WebSocket service...');
    }
    
    const allowedOrigins = [
      'https://axplatform.app',              // Production domain
      'https://www.axplatform.app',          // WWW variant
      'https://eos-platform.netlify.app',   // Legacy Netlify domain
      'http://localhost:5173',               // Vite dev server
      'http://localhost:3000',               // Alternative dev server
      'http://localhost:5174',               // Backup dev server
      process.env.FRONTEND_URL               // Environment-specific URL
    ].filter(Boolean); // Remove any undefined values
    
    if (process.env.LOG_LEVEL === 'debug') {
      console.log('🔌 Socket.IO CORS allowed origins:', allowedOrigins);
      console.log('🔍 Environment FRONTEND_URL:', process.env.FRONTEND_URL);
    }
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
      },
      // Namespace to isolate meeting sockets from any future socket usage
      path: '/meeting-socket'
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log('👤 User connected:', socket.id);
      }

      // Handle joining a meeting
      socket.on('join-meeting', (data) => {
        const { meetingCode, userId, userName, isLeader } = data;

        if (!meetingCode) {
          socket.emit('error', { message: 'Meeting code required' });
          return;
        }

        // AUTO-LEAVE: Check if user is already in a different meeting and remove them
        const existingSocketData = userSocketMap.get(socket.id);
        if (existingSocketData && existingSocketData.meetingCode !== meetingCode) {
          console.log(`⚠️ User ${userName} is switching from meeting ${existingSocketData.meetingCode} to ${meetingCode}`);
          
          // Remove from old meeting
          const oldMeeting = meetings.get(existingSocketData.meetingCode);
          if (oldMeeting) {
            // Check if user was leader of old meeting
            const wasLeaderOfOldMeeting = oldMeeting.leader === userId;
            
            // Remove from participants
            oldMeeting.participants.delete(userId);
            
            // Notify other participants in old meeting
            socket.to(existingSocketData.meetingCode).emit('participant-left', { 
              userId,
              reason: 'joined-different-meeting'
            });
            
            // Leave the socket room
            socket.leave(existingSocketData.meetingCode);
            
            console.log(`✅ User ${userName} removed from old meeting ${existingSocketData.meetingCode}`);
            
            // Clean up empty meetings
            if (oldMeeting.participants.size === 0) {
              meetings.delete(existingSocketData.meetingCode);
              console.log(`🗑️ Old meeting ${existingSocketData.meetingCode} deleted (no participants)`);
            } else if (wasLeaderOfOldMeeting) {
              // Transfer leadership if user was leader
              const nextParticipant = oldMeeting.participants.values().next().value;
              if (nextParticipant) {
                oldMeeting.leader = nextParticipant.id;
                this.io.to(existingSocketData.meetingCode).emit('leader-changed', {
                  newLeader: nextParticipant.id,
                  newLeaderName: nextParticipant.name,
                  reason: 'previous-leader-joined-different-meeting'
                });
                console.log(`👑 Leadership in ${existingSocketData.meetingCode} transferred to ${nextParticipant.name}`);
              }
            }
            
            // Broadcast updated active meetings
            this.broadcastActiveMeetings();
          }
        }

        // Check if this user is reconnecting within grace period
        const disconnectKey = `${meetingCode}:${userId}`;
        const disconnectedInfo = disconnectedUsers.get(disconnectKey);
        let isReconnecting = false;
        let shouldRestoreLeadership = false;

        if (disconnectedInfo) {
          // User is reconnecting - cancel the removal timeout
          clearTimeout(disconnectedInfo.timeoutId);
          disconnectedUsers.delete(disconnectKey);
          isReconnecting = true;
          shouldRestoreLeadership = disconnectedInfo.wasLeader;
          console.log(`🔄 ${userName} reconnecting to meeting ${meetingCode} (was leader: ${shouldRestoreLeadership})`);
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
          } else if (meetingCode.includes('-weekly-express')) {
            // Extract teamId from meeting code format: orgId-teamId-weekly-express
            // Format: 8-4-4-4-12-8-4-4-4-12-weekly-express (UUID-UUID-suffix)
            const teamId = this.extractTeamIdFromMeetingCode(meetingCode, 'weekly-express');
            initialRoute = `/meetings/weekly-express/${teamId}`;
          } else if (meetingCode.includes('-quarterly-planning')) {
            // Extract teamId from meeting code format: orgId-teamId-quarterly-planning
            const teamId = this.extractTeamIdFromMeetingCode(meetingCode, 'quarterly-planning');
            initialRoute = `/meetings/quarterly-planning/${teamId}`;
          } else if (meetingCode.includes('-annual-planning')) {
            // Extract teamId from meeting code format: orgId-teamId-annual-planning
            const teamId = this.extractTeamIdFromMeetingCode(meetingCode, 'annual-planning');
            initialRoute = `/meetings/annual-planning/${teamId}`;
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

        // Restore leadership if user was leader before disconnect
        if (shouldRestoreLeadership) {
          meeting.leader = userId;
          console.log(`👑 Leadership restored to ${userName} after reconnection`);
          // Notify all participants about leadership restoration
          this.io.to(meetingCode).emit('presenter-changed', {
            newPresenter: userId,
            presenterName: userName,
            reason: 'reconnected'
          });
        }

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

        // MONITORING: Log successful join
        console.log(`✅ [MEETING HEALTH] User ${userName} joined meeting ${meetingCode} (participants: ${meeting.participants.size}, leader: ${meeting.leader === userId ? 'YES' : 'NO'})`);

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
          participants: Array.from(meeting.participants.values()),
          reconnected: isReconnecting
        });

        // Notify others of new participant (or reconnection)
        socket.to(meetingCode).emit(isReconnecting ? 'participant-reconnected' : 'participant-joined', {
          participant: meeting.participants.get(userId)
        });

        // Broadcast updated active meetings to all connected clients
        this.broadcastActiveMeetings();

        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`✅ ${userName} ${isReconnecting ? 'reconnected to' : 'joined'} meeting ${meetingCode}`);
        }
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

        if (process.env.LOG_LEVEL === 'debug') {
          console.log(`📍 Leader ${userInfo.userId} navigated to route: ${data.route}, section: ${data.section || 'none'}`);
          console.log(`📍 Broadcasting to meeting: ${userInfo.meetingCode}`);
        }
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
        const userInfo = userSocketMap.get(socket.id);
        if (userInfo) {
          console.log(`👋 [MEETING HEALTH] User ${userInfo.userName} leaving meeting ${userInfo.meetingCode}`);
        }
        this.handleUserDisconnect(socket);
      });

      // Handle concluding meeting (leader ends meeting for everyone)
      socket.on('conclude-meeting', (data) => {
        const { meetingCode } = data;
        
        if (!meetingCode) {
          console.error('❌ conclude-meeting: No meeting code provided');
          return;
        }
        
        const meeting = meetings.get(meetingCode);
        if (!meeting) {
          console.log(`🗑️ Meeting ${meetingCode} already deleted`);
          return;
        }
        
        console.log(`🏁 Concluding meeting ${meetingCode} - removing all participants`);
        
        // Remove all participants from socket rooms
        meeting.participants.forEach((participant, userId) => {
          console.log(`  👋 Removing participant: ${participant.name}`);
        });
        
        // Delete the meeting from the map
        meetings.delete(meetingCode);
        console.log(`✅ Meeting ${meetingCode} deleted from active meetings`);
        
        // Broadcast updated active meetings to all connected clients
        this.broadcastActiveMeetings();
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
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📊 Broadcasting vote update for issue:', issueId, 'to meeting:', meetingCode);
        }
      });
      
      // Handle issue status changes
      socket.on('update-issue-status', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast issue status update to all participants
        socket.to(meetingCode).emit('issue-status-update', data);
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📊 Broadcasting issue status update to meeting:', meetingCode);
        }
      });
      
      // Handle todo updates (completion, creation, deletion)
      socket.on('update-todo', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast todo update to all participants
        socket.to(meetingCode).emit('todo-update', data);
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('✅ Broadcasting todo update to meeting:', meetingCode, 'action:', data.action);
        }
      });
      
      // Handle issue creation/deletion
      socket.on('update-issue-list', (data) => {
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) return;
        
        const { meetingCode } = userData;
        
        // Broadcast issue list update to all participants
        socket.to(meetingCode).emit('issue-list-update', data);
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📝 Broadcasting issue list update to meeting:', meetingCode, 'action:', data.action);
        }
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
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('⏱️ Broadcasting timer update to meeting:', meetingCode, 'timer state:', data);
        }
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
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📝 Broadcasting notes update to meeting:', meetingCode, 'section:', data.section);
        }
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

        // Broadcast new presenter to ALL participants INCLUDING the claimer
        // Using this.io.to() instead of socket.to() so the sender also receives the event
        this.io.to(meetingCode).emit('presenter-changed', {
          newPresenter: userId,
          presenterName: data.presenterName
        });

        if (process.env.LOG_LEVEL === 'debug') {
          console.log('👑 Presenter changed in meeting:', meetingCode, 'new presenter:', userId);
        }
      });
      
      // Handle participant rating submission
      socket.on('submit-rating', (data) => {
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('🎯 RATING SUBMISSION RECEIVED:', {
            socketId: socket.id,
            data,
            hasUserData: userSocketMap.has(socket.id),
            currentSocketRooms: Array.from(socket.rooms)
          });
        }
        
        const userData = userSocketMap.get(socket.id);
        
        if (!userData) {
          if (process.env.LOG_LEVEL === 'debug') {
            console.error('❌ No user data found for socket:', socket.id);
            console.log('📊 Current userSocketMap:', Array.from(userSocketMap.entries()));
          }
          return;
        }
        
        const { meetingCode, userId: socketUserId } = userData;
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('💾 BEFORE SAVE - userData:', userData);
          console.log('💾 BEFORE SAVE - meeting.ratings:', meeting?.ratings ? Array.from(meeting.ratings.entries()) : 'No ratings Map yet');
          console.log('🔍 Meeting lookup:', {
            meetingCode,
            meetingExists: !!meeting,
            participants: meeting ? Array.from(meeting.participants.values()) : [],
            leader: meeting ? meeting.leader : null
          });
        }
        
        const meeting = meetings.get(meetingCode);
        
        if (!meeting) {
          if (process.env.LOG_LEVEL === 'debug') {
            console.error('❌ No meeting found for code:', meetingCode);
          }
          return;
        }
        
        // Store the rating in the meeting object
        if (!meeting.ratings) {
          meeting.ratings = new Map();
        }
        
        // Use the userId from data (for facilitator-entered ratings for non-app users) or socket user
        const ratingUserId = data.userId || socketUserId;
        const ratingUserName = data.userName || userData.userName;
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('💾 Storing rating:', {
            ratingUserId,
            ratingUserName,
            rating: data.rating,
            socketUserId,
            dataUserId: data.userId
          });
        }
        
        meeting.ratings.set(ratingUserId, {
          userId: ratingUserId,
          userName: ratingUserName,
          rating: data.rating,
          submittedAt: new Date()
        });
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('💾 AFTER SAVE - meeting.ratings:', Array.from(meeting.ratings.entries()));
          console.log('💾 AFTER SAVE - meeting.ratings.size:', meeting.ratings.size);
        }
        
        // Calculate average rating
        const allRatings = Array.from(meeting.ratings.values());
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📡 All ratings to broadcast:', allRatings);
        }
        
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
        
        if (process.env.LOG_LEVEL === 'debug') {
          console.log('📤 BROADCASTING RATING:', {
            to: meetingCode,
            data: broadcastData,
            socketsInRoom: this.io.sockets.adapter.rooms.get(meetingCode) ? 
              Array.from(this.io.sockets.adapter.rooms.get(meetingCode)) : [],
            socketIsInRoom: socket.rooms.has(meetingCode)
          });
        }
        
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

      // === AI TRANSCRIPTION AUDIO STREAMING HANDLERS ===
      
      // Handle starting AI recording
      socket.on('start-ai-recording', async (data) => {
        try {
          const { meetingId, organizationId, transcriptId } = data;
          
          if (!transcriptId) {
            socket.emit('ai-recording-error', { message: 'Transcript ID required' });
            return;
          }

          if (process.env.LOG_LEVEL === 'debug') {
            console.log(`🎙️ Starting AI recording for meeting ${meetingId}, transcript ${transcriptId}`);
          }

          // Start real-time transcription with AssemblyAI
          const session = await transcriptionService.startRealtimeTranscription(transcriptId, organizationId);

          // Store transcription info in meeting data
          const userData = userSocketMap.get(socket.id);
          if (userData) {
            const meeting = meetings.get(userData.meetingCode);
            if (meeting) {
              meeting.transcription = {
                transcriptId,
                meetingId,
                organizationId,
                startedAt: new Date(),
                status: 'recording'
              };
            }
          }

          // Notify all meeting participants
          const userData2 = userSocketMap.get(socket.id);
          if (userData2) {
            this.io.to(userData2.meetingCode).emit('ai-recording-started', {
              transcriptId,
              sessionId: session.sessionId,
              status: 'recording'
            });
          }

          console.log(`✅ AI recording started for transcript ${transcriptId}`);
        } catch (error) {
          console.error('❌ Failed to start AI recording:', error);
          socket.emit('ai-recording-error', { 
            message: 'Failed to start AI recording',
            error: error.message 
          });
        }
      });

      // Handle audio data chunks from frontend
      socket.on('audio-chunk', async (data) => {
        try {
          const { transcriptId, audioData } = data;
          
          if (!transcriptId || !audioData) {
            return; // Silently ignore invalid chunks
          }

          // Convert base64 audio data to buffer
          const audioBuffer = Buffer.from(audioData, 'base64');

          // Check if buffer contains actual audio data (not all zeros or near-silent)
          const hasAudioContent = this.validateAudioContent(audioBuffer);

          // DEBUG: Log audio format details (TEMPORARILY ENABLED for debugging)
          console.log('[AUDIO-DEBUG] Received audio chunk:', {
            size: audioBuffer.length,
            first4Bytes: audioBuffer.slice(0, 4).toString('hex'),
            first8Bytes: audioBuffer.slice(0, 8).toString('hex'),
            isLikelyPCM: audioBuffer.length % 2 === 0, // PCM S16LE should be even-sized
            hasAudioContent: hasAudioContent,
            timestamp: new Date().toISOString()
          });

          // Skip empty/silent audio chunks to prevent AssemblyAI error 3005
          if (!hasAudioContent) {
            console.log('[AUDIO-DEBUG] Skipping empty/silent audio chunk');
            return;
          }

          // Send to AssemblyAI via transcription service
          const success = await transcriptionService.sendAudioData(transcriptId, audioBuffer);
          
          if (!success) {
            console.warn(`⚠️ Failed to send audio chunk for transcript ${transcriptId}`);
          }

        } catch (error) {
          console.error('❌ Error processing audio chunk:', error);
        }
      });

      // Handle stopping AI recording
      socket.on('stop-ai-recording', async (data) => {
        try {
          const { transcriptId, meetingId } = data;
          
          if (!transcriptId) {
            socket.emit('ai-recording-error', { message: 'Transcript ID required' });
            return;
          }

          console.log(`🛑 Stopping AI recording for transcript ${transcriptId}`);

          // Stop real-time transcription
          const transcriptData = await transcriptionService.stopRealtimeTranscription(transcriptId);

          // Update meeting data
          const userData = userSocketMap.get(socket.id);
          if (userData) {
            const meeting = meetings.get(userData.meetingCode);
            if (meeting && meeting.transcription) {
              meeting.transcription.status = 'processing_ai';
              meeting.transcription.endedAt = new Date();
            }
          }

          // Notify all meeting participants
          if (userData) {
            this.io.to(userData.meetingCode).emit('ai-recording-stopped', {
              transcriptId,
              status: 'processing_ai',
              message: 'Processing transcript and generating AI summary...'
            });
          }

          // Trigger AI summary generation (async)
          if (transcriptData && transcriptData.fullTranscript) {
            aiSummaryService.generateAISummary(transcriptId, transcriptData.fullTranscript)
              .then(() => {
                console.log(`✅ AI summary completed for transcript ${transcriptId}`);
                
                // Notify participants that AI summary is ready
                if (userData) {
                  this.io.to(userData.meetingCode).emit('ai-summary-ready', {
                    transcriptId,
                    meetingId,
                    status: 'completed'
                  });
                }
              })
              .catch(error => {
                console.error(`❌ AI summary failed for transcript ${transcriptId}:`, error);
                
                if (userData) {
                  this.io.to(userData.meetingCode).emit('ai-recording-error', {
                    message: 'Failed to generate AI summary',
                    transcriptId
                  });
                }
              });
          }

          console.log(`✅ AI recording stopped for transcript ${transcriptId}`);
        } catch (error) {
          console.error('❌ Failed to stop AI recording:', error);
          socket.emit('ai-recording-error', { 
            message: 'Failed to stop AI recording',
            error: error.message 
          });
        }
      });

      // Handle transcript chunk broadcasts (called by transcriptionService)
      socket.on('broadcast-transcript-update', (data) => {
        const userData = userSocketMap.get(socket.id);
        if (userData) {
          // Broadcast transcript update to all meeting participants
          this.io.to(userData.meetingCode).emit('transcript-update', data);
        }
      });
    });
  }

  broadcastActiveMeetings() {
    const activeMeetings = {};
    meetings.forEach((meeting, code) => {
      if (meeting.participants.size > 0) {
        // Parse the meeting code to get team and type
        // Meeting code format: teamId-meetingType where meetingType can be multi-part (e.g., weekly-accountability)
        // teamId is a UUID with hyphens, so we need to split correctly
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
    const wasLeader = meeting.leader === userInfo.userId;
    const { meetingCode, userId } = userInfo;

    // Remove socket mapping immediately (socket is no longer valid)
    userSocketMap.delete(socket.id);

    // Create disconnect key for grace period tracking
    const disconnectKey = `${meetingCode}:${userId}`;

    // Check if user is already in grace period (multiple socket disconnects)
    if (disconnectedUsers.has(disconnectKey)) {
      console.log(`⏳ ${userName} already in grace period, resetting timeout`);
      
      // Get existing disconnect info
      const existingInfo = disconnectedUsers.get(disconnectKey);
      
      // Clear old timeout
      clearTimeout(existingInfo.timeoutId);
      
      // Create new timeout (restart grace period)
      const newTimeoutId = setTimeout(() => {
        this.finalizeUserRemoval(meetingCode, userId, userName, wasLeader);
      }, DISCONNECT_GRACE_PERIOD_MS);
      
      // Update timeout ID and timestamp
      existingInfo.timeoutId = newTimeoutId;
      existingInfo.disconnectedAt = new Date();
      
      console.log(`✅ Grace period reset for ${userName}`);
      return;
    }

    console.log(`⏸️ ${userName} disconnected from meeting ${meetingCode} - starting ${DISCONNECT_GRACE_PERIOD_MS/1000}s grace period`);

    // Notify others that user temporarily disconnected (but may reconnect)
    socket.to(meetingCode).emit('participant-temporarily-disconnected', {
      userId: userId,
      userName: userName,
      gracePeriodSeconds: DISCONNECT_GRACE_PERIOD_MS / 1000
    });

    // Set up timeout to fully remove user after grace period
    const timeoutId = setTimeout(() => {
      this.finalizeUserRemoval(meetingCode, userId, userName, wasLeader);
    }, DISCONNECT_GRACE_PERIOD_MS);

    // Store disconnect info for potential reconnection
    disconnectedUsers.set(disconnectKey, {
      userId,
      userName,
      wasLeader,
      disconnectedAt: new Date(),
      timeoutId
    });
  }

  // Called after grace period expires - fully removes user from meeting
  finalizeUserRemoval(meetingCode, userId, userName, wasLeader) {
    const disconnectKey = `${meetingCode}:${userId}`;

    // Check if user reconnected during grace period
    if (!disconnectedUsers.has(disconnectKey)) {
      console.log(`✅ ${userName} reconnected before grace period expired`);
      return;
    }

    // Remove from disconnected tracking
    disconnectedUsers.delete(disconnectKey);

    const meeting = meetings.get(meetingCode);
    if (!meeting) return;

    // Now fully remove the participant
    meeting.participants.delete(userId);

    // Notify others that user has left for real
    this.io.to(meetingCode).emit('participant-left', {
      userId: userId
    });

    console.log(`👋 ${userName} removed from meeting ${meetingCode} (grace period expired)`);

    // Broadcast updated active meetings
    this.broadcastActiveMeetings();

    // Clean up empty meetings
    if (meeting.participants.size === 0) {
      meetings.delete(meetingCode);
      console.log(`🗑️ Meeting ${meetingCode} ended (no participants)`);
    } else if (wasLeader) {
      // Transfer leadership to next participant only after grace period
      const nextParticipant = meeting.participants.values().next().value;
      if (nextParticipant) {
        meeting.leader = nextParticipant.id;
        this.io.to(meetingCode).emit('leader-changed', {
          newLeader: nextParticipant.id,
          reason: 'previous-leader-left'
        });
        console.log(`👑 Leadership transferred to ${nextParticipant.name} (original leader didn't reconnect)`);
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
      
      // Remove the suffix to get either: teamId or orgId-teamId
      const withoutSuffix = meetingCode.slice(0, -suffix.length);
      
      // UUIDs are 36 characters long (8-4-4-4-12 format)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let teamId;
      
      if (withoutSuffix.length === 36) {
        // Legacy format: just teamId-meetingType (36 characters)
        teamId = withoutSuffix;
        console.log(`✅ Using legacy meeting code format (teamId only): ${teamId}`);
      } else if (withoutSuffix.length === 73) {
        // New format: orgId-teamId-meetingType (73 characters: 36 + 1 + 36)
        teamId = withoutSuffix.slice(-36); // Extract teamId (last 36 characters)
        console.log(`✅ Using new meeting code format (orgId-teamId): ${teamId}`);
      } else {
        console.error(`Unexpected meeting code format. Expected length 36 (legacy) or 73 (new), got: ${withoutSuffix.length}`);
        console.error(`Full meeting code: ${meetingCode}`);
        console.error(`Without suffix: ${withoutSuffix}`);
        return null;
      }
      
      // Validate the extracted teamId looks like a UUID
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

  /**
   * Validate audio content to prevent sending empty/silent chunks to AssemblyAI
   * @param {Buffer} audioBuffer - PCM audio data buffer
   * @returns {boolean} - True if buffer contains meaningful audio content
   */
  validateAudioContent(audioBuffer) {
    // Check for minimum buffer size (avoid processing tiny chunks)
    if (audioBuffer.length < 128) {
      return false;
    }

    // Convert buffer to 16-bit PCM samples for analysis
    const samples = [];
    for (let i = 0; i < Math.min(audioBuffer.length, 1024); i += 2) {
      // Read 16-bit signed integer (little-endian)
      const sample = audioBuffer.readInt16LE(i);
      samples.push(sample);
    }

    // Check if all samples are zero (completely silent)
    const allZeros = samples.every(sample => sample === 0);
    if (allZeros) {
      return false;
    }

    // Calculate RMS (Root Mean Square) to detect low-amplitude audio
    const sumSquares = samples.reduce((sum, sample) => sum + (sample * sample), 0);
    const rms = Math.sqrt(sumSquares / samples.length);
    
    // Set minimum RMS threshold (adjust based on testing)
    // Typical speech should have RMS > 100, silence/noise < 50
    // TEMPORARILY LOWERED for debugging - was 50
    const minRmsThreshold = 10;
    
    console.log(`[AUDIO-VALIDATION] RMS: ${rms.toFixed(2)}, threshold: ${minRmsThreshold}, valid: ${rms > minRmsThreshold}`);
    
    return rms > minRmsThreshold;
  }

  // Broadcast to a specific meeting room by meeting code
  broadcastToMeeting(meetingCode, event, data) {
    if (!this.io) {
      console.error('Socket.IO not initialized');
      return;
    }
    this.io.to(meetingCode).emit(event, data);
  }

  // Get meeting code from meeting ID (database lookup)
  // The meeting_id passed here is actually a meeting_sessions.id (sessionId)
  // We need to construct the meeting code from org_id, team_id, and meeting_type
  async getMeetingCodeByMeetingId(meetingId) {
    try {
      const { query } = await import('../config/database.js');
      
      // Try to find in meeting_sessions first (for collaborative meetings)
      const sessionResult = await query(
        'SELECT organization_id, team_id, meeting_type FROM meeting_sessions WHERE id = $1',
        [meetingId]
      );
      
      if (sessionResult.rows.length > 0) {
        const { organization_id, team_id, meeting_type } = sessionResult.rows[0];
        // Construct meeting code: {orgId}-{teamId}-{meetingType}
        // e.g., "abc123-def456-weekly" or "abc123-def456-weekly-accountability"
        const meetingTypeSlug = meeting_type === 'weekly' ? 'weekly-accountability' : meeting_type;
        return `${organization_id}-${team_id}-${meetingTypeSlug}`;
      }
      
      // If not found in meeting_sessions, it might be a traditional meeting
      // Traditional meetings don't use WebSocket rooms, so return null
      return null;
    } catch (error) {
      console.error('Error getting meeting code:', error.message);
      return null;
    }
  }

  // Broadcast to a meeting using meeting ID instead of code
  async broadcastToMeetingById(meetingId, event, data) {
    const meetingCode = await this.getMeetingCodeByMeetingId(meetingId);
    if (meetingCode) {
      this.broadcastToMeeting(meetingCode, event, data);
    }
  }

  // ============ MEETING HEALTH MONITORING ============

  /**
   * Validate meeting state consistency and detect anomalies
   * This is read-only and safe to call frequently
   */
  validateMeetingHealth() {
    const anomalies = [];

    try {
      // Check 1: Detect users in multiple meetings (ghost participants)
      const userMeetingMap = new Map(); // userId -> [meetingCodes]
      
      for (const [meetingCode, meeting] of meetings.entries()) {
        for (const [userId, participant] of meeting.participants.entries()) {
          if (!userMeetingMap.has(userId)) {
            userMeetingMap.set(userId, []);
          }
          userMeetingMap.get(userId).push({
            meetingCode,
            participantName: participant.name,
            isLeader: meeting.leader === userId
          });
        }
      }

      // Report users in multiple meetings
      for (const [userId, meetingList] of userMeetingMap.entries()) {
        if (meetingList.length > 1) {
          anomalies.push({
            type: 'GHOST_PARTICIPANT',
            severity: 'HIGH',
            userId,
            userName: meetingList[0].participantName,
            meetings: meetingList.map(m => m.meetingCode),
            message: `User ${meetingList[0].participantName} appears in ${meetingList.length} meetings simultaneously`
          });
        }
      }

      // Check 2: Detect meetings with 0 participants (should not exist)
      for (const [meetingCode, meeting] of meetings.entries()) {
        if (meeting.participants.size === 0) {
          anomalies.push({
            type: 'EMPTY_MEETING',
            severity: 'MEDIUM',
            meetingCode,
            message: `Meeting ${meetingCode} exists with 0 participants`
          });
        }
      }

      // Check 3: Validate socket mapping consistency
      for (const [socketId, userData] of userSocketMap.entries()) {
        const meeting = meetings.get(userData.meetingCode);
        if (!meeting) {
          anomalies.push({
            type: 'ORPHANED_SOCKET',
            severity: 'LOW',
            socketId,
            userId: userData.userId,
            userName: userData.userName,
            meetingCode: userData.meetingCode,
            message: `Socket ${socketId} mapped to non-existent meeting ${userData.meetingCode}`
          });
        } else if (!meeting.participants.has(userData.userId)) {
          anomalies.push({
            type: 'SOCKET_PARTICIPANT_MISMATCH',
            severity: 'MEDIUM',
            socketId,
            userId: userData.userId,
            userName: userData.userName,
            meetingCode: userData.meetingCode,
            message: `Socket ${socketId} for user ${userData.userName} exists but user not in meeting participants`
          });
        }
      }

      // Check 4: Validate participant socket references
      for (const [meetingCode, meeting] of meetings.entries()) {
        for (const [userId, participant] of meeting.participants.entries()) {
          const socketData = userSocketMap.get(participant.socketId);
          if (!socketData) {
            anomalies.push({
              type: 'INVALID_SOCKET_REFERENCE',
              severity: 'LOW',
              meetingCode,
              userId,
              userName: participant.name,
              socketId: participant.socketId,
              message: `Participant ${participant.name} has invalid socket reference ${participant.socketId}`
            });
          } else if (socketData.meetingCode !== meetingCode) {
            anomalies.push({
              type: 'SOCKET_MEETING_MISMATCH',
              severity: 'HIGH',
              meetingCode,
              userId,
              userName: participant.name,
              socketId: participant.socketId,
              actualMeetingCode: socketData.meetingCode,
              message: `Participant ${participant.name} in meeting ${meetingCode} but socket mapped to ${socketData.meetingCode}`
            });
          }
        }
      }

      // Log anomalies
      if (anomalies.length > 0) {
        console.warn(`⚠️ [MEETING HEALTH] Detected ${anomalies.length} anomalies:`);
        anomalies.forEach(anomaly => {
          console.warn(`  [${anomaly.severity}] ${anomaly.type}: ${anomaly.message}`);
        });
      }

      return {
        healthy: anomalies.length === 0,
        anomalyCount: anomalies.length,
        anomalies,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[MEETING HEALTH] Error during validation:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get comprehensive meeting health stats
   * Safe to call frequently, read-only
   */
  getMeetingHealthStats() {
    try {
      const stats = {
        timestamp: new Date(),
        meetings: {
          total: meetings.size,
          withParticipants: 0,
          empty: 0,
          list: []
        },
        participants: {
          total: 0,
          uniqueUsers: new Set(),
          inMultipleMeetings: 0
        },
        sockets: {
          total: userSocketMap.size,
          orphaned: 0
        },
        gracePeriod: {
          usersInGracePeriod: disconnectedUsers.size,
          list: Array.from(disconnectedUsers.entries()).map(([key, info]) => ({
            key,
            userId: info.userId,
            userName: info.userName,
            wasLeader: info.wasLeader,
            disconnectedAt: info.disconnectedAt,
            timeRemaining: Math.max(0, DISCONNECT_GRACE_PERIOD_MS - (Date.now() - info.disconnectedAt.getTime()))
          }))
        }
      };

      // Collect meeting details
      for (const [meetingCode, meeting] of meetings.entries()) {
        const participantCount = meeting.participants.size;
        
        if (participantCount === 0) {
          stats.meetings.empty++;
        } else {
          stats.meetings.withParticipants++;
        }

        stats.participants.total += participantCount;

        // Track unique users and detect multiple meeting participation
        for (const userId of meeting.participants.keys()) {
          stats.participants.uniqueUsers.add(userId);
        }

        stats.meetings.list.push({
          code: meetingCode,
          participantCount,
          leader: meeting.leader,
          currentRoute: meeting.currentRoute,
          createdAt: meeting.createdAt
        });
      }

      // Calculate users in multiple meetings
      const userMeetingCount = new Map();
      for (const [meetingCode, meeting] of meetings.entries()) {
        for (const userId of meeting.participants.keys()) {
          userMeetingCount.set(userId, (userMeetingCount.get(userId) || 0) + 1);
        }
      }
      stats.participants.inMultipleMeetings = Array.from(userMeetingCount.values()).filter(count => count > 1).length;

      // Count orphaned sockets
      for (const [socketId, userData] of userSocketMap.entries()) {
        if (!meetings.has(userData.meetingCode)) {
          stats.sockets.orphaned++;
        }
      }

      stats.participants.uniqueUsers = stats.participants.uniqueUsers.size;

      return stats;
    } catch (error) {
      console.error('[MEETING HEALTH] Error getting stats:', error);
      return {
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Log meeting health summary to console
   * Call this periodically or on-demand for monitoring
   */
  logMeetingHealthSummary() {
    const health = this.validateMeetingHealth();
    const stats = this.getMeetingHealthStats();

    console.log('\n========== MEETING HEALTH SUMMARY ==========');
    console.log(`Timestamp: ${stats.timestamp.toISOString()}`);
    console.log(`\nMeetings:`);
    console.log(`  Total: ${stats.meetings.total}`);
    console.log(`  With Participants: ${stats.meetings.withParticipants}`);
    console.log(`  Empty: ${stats.meetings.empty}`);
    console.log(`\nParticipants:`);
    console.log(`  Total: ${stats.participants.total}`);
    console.log(`  Unique Users: ${stats.participants.uniqueUsers}`);
    console.log(`  In Multiple Meetings: ${stats.participants.inMultipleMeetings}`);
    console.log(`\nSockets:`);
    console.log(`  Total: ${stats.sockets.total}`);
    console.log(`  Orphaned: ${stats.sockets.orphaned}`);
    console.log(`\nGrace Period:`);
    console.log(`  Users: ${stats.gracePeriod.usersInGracePeriod}`);
    console.log(`\nHealth Status: ${health.healthy ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}`);
    console.log(`Anomalies: ${health.anomalyCount}`);
    console.log('==========================================\n');

    return { health, stats };
  }
}

export default new MeetingSocketService();