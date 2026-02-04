// Meeting WebSocket Service - Handles real-time meeting features
// This is ADDITIVE - does not modify any existing functionality

import { Server as SocketIOServer } from 'socket.io';
import transcriptionService from './transcriptionService.js';
import aiSummaryService from './aiSummaryService.js';
import { logMeetingError } from './meetingAlertService.js';
import { pool } from '../config/database.js';

// Feature flag - can be disabled instantly via environment variable
const ENABLE_MEETINGS = process.env.ENABLE_MEETINGS === 'true';

// In-memory storage for meetings (no database changes)
const meetings = new Map();
const userSocketMap = new Map();

// Track temporarily disconnected users for reconnection grace period
// Key: `${meetingCode}:${userId}`, Value: { userId, userName, wasLeader, disconnectedAt, timeoutId }
const disconnectedUsers = new Map();

// Grace period in milliseconds before fully removing a disconnected user
// Increased from 45s to 5 minutes to handle longer network interruptions during meetings
const DISCONNECT_GRACE_PERIOD_MS = 300000; // 5 minutes

// Heartbeat interval for periodic database sync (30 seconds)
const HEARTBEAT_SYNC_INTERVAL_MS = 30000;

class MeetingSocketService {
  constructor() {
    this.io = null;
    this.heartbeatInterval = null;
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
    this.startHeartbeatSync();
  }

  // ============ PERIODIC HEARTBEAT SYNC ============
  // Syncs all active meetings to database every 30 seconds to prevent state loss
  startHeartbeatSync() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const activeMeetings = Array.from(meetings.entries());
        if (activeMeetings.length === 0) return;

        console.log(`💓 [HEARTBEAT] Syncing ${activeMeetings.length} active meetings to database...`);

        for (const [meetingCode, meeting] of activeMeetings) {
          if (meeting.participants.size === 0) continue;

          try {
            const ids = this.extractIdsFromMeetingCode(meetingCode);
            if (!ids) continue;

            const client = await pool.connect();
            try {
              // Update the session with current state
              const result = await client.query(`
                UPDATE meeting_sessions
                SET 
                  current_section = $1,
                  participant_count = $2,
                  updated_at = NOW()
                WHERE team_id = $3 AND is_active = true
                RETURNING id
              `, [meeting.currentSection, meeting.participants.size, ids.teamId]);

              if (result.rows.length > 0) {
                console.log(`💓 [HEARTBEAT] Synced meeting ${meetingCode}: section=${meeting.currentSection}, participants=${meeting.participants.size}`);
              }
            } finally {
              client.release();
            }
          } catch (meetingError) {
            console.error(`💓 [HEARTBEAT] Failed to sync meeting ${meetingCode}:`, meetingError.message);
            // Alert on repeated heartbeat failures
            logMeetingError({
              organizationId: ids.orgId,
              errorType: 'heartbeat_sync_failure',
              severity: 'warning',
              errorMessage: `Heartbeat sync failed for meeting: ${meetingError.message}`,
              context: {
                meetingCode,
                currentSection: meeting.currentSection,
                participantCount: meeting.participants.size
              }
            }).catch(err => console.error('Failed to log heartbeat alert:', err));
          }
        }
      } catch (error) {
        console.error('💓 [HEARTBEAT] Error during heartbeat sync:', error.message);
      }
    }, HEARTBEAT_SYNC_INTERVAL_MS);

    console.log(`💓 [HEARTBEAT] Started periodic database sync every ${HEARTBEAT_SYNC_INTERVAL_MS / 1000}s`);
  }

  stopHeartbeatSync() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('💓 [HEARTBEAT] Stopped periodic database sync');
    }
  }
  // ============ END HEARTBEAT SYNC ============

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log('👤 User connected:', socket.id);
      }

      // Handle joining a meeting
      socket.on('join-meeting', async (data) => {
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
            
            // Clean up empty meetings - but check database first
            if (oldMeeting.participants.size === 0) {
              // Check if there's an active database session before deleting
              const oldIds = this.extractIdsFromMeetingCode(existingSocketData.meetingCode);
              if (oldIds) {
                const oldDbSession = await this.checkActiveDatabaseSession(oldIds.orgId, oldIds.teamId, oldIds.meetingType);
                if (oldDbSession) {
                  console.log(`📊 [SYNC] Preserving meeting ${existingSocketData.meetingCode} - active database session exists`);
                  // Don't delete - keep the meeting shell for reconnections
                } else {
                  meetings.delete(existingSocketData.meetingCode);
                  console.log(`🗑️ Old meeting ${existingSocketData.meetingCode} deleted (no participants, no active DB session)`);
                }
              } else {
                meetings.delete(existingSocketData.meetingCode);
                console.log(`🗑️ Old meeting ${existingSocketData.meetingCode} deleted (no participants)`);
              }
            } else if (wasLeaderOfOldMeeting) {
              // LEADER PROTECTION: Don't transfer leadership, just mark as disconnected
              oldMeeting.leaderDisconnected = true;
              this.io.to(existingSocketData.meetingCode).emit('leader-disconnected', {
                leaderId: userId,
                leaderName: userName,
                message: 'The meeting leader has left. Waiting for them to return...'
              });
              console.log(`⚠️ Leader left meeting ${existingSocketData.meetingCode} - NOT transferring leadership`);
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
          // CRITICAL FIX: Check for active database session before creating new in-memory meeting
          // This ensures we sync with the database state and don't create orphaned meetings
          const meetingIds = this.extractIdsFromMeetingCode(meetingCode);
          let dbSession = null;
          
          if (meetingIds) {
            dbSession = await this.checkActiveDatabaseSession(meetingIds.orgId, meetingIds.teamId, meetingIds.meetingType);
            if (dbSession) {
              console.log(`📊 [SYNC] Found active database session - syncing in-memory state`);
              console.log(`📊 [SYNC] DB Session ID: ${dbSession.sessionId}, Facilitator: ${dbSession.facilitatorName}`);
            }
          }
          
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
          
          // If there's an active database session, sync the leader from it
          // This prevents the "first joiner becomes leader" issue when the original leader disconnected
          let syncedLeader = isLeader ? userId : null;
          let syncedOriginalLeader = isLeader ? userId : null;
          let syncedLeaderDisconnected = false;
          
          if (dbSession) {
            // If the current user is the original facilitator from the database, make them leader
            if (userId === dbSession.facilitatorId) {
              syncedLeader = userId;
              syncedOriginalLeader = userId;
              syncedLeaderDisconnected = false;
              console.log(`👑 [SYNC] User ${userName} is the original facilitator - restoring leadership`);
            } else {
              // Someone else is joining - the original facilitator is the leader but disconnected
              syncedLeader = dbSession.facilitatorId;
              syncedOriginalLeader = dbSession.facilitatorId;
              syncedLeaderDisconnected = true;
              console.log(`⚠️ [SYNC] User ${userName} joining - original facilitator (${dbSession.facilitatorName}) is disconnected`);
              
              // ALERT: Notify that a participant is joining a meeting with a disconnected leader
              if (meetingIds?.orgId) {
                logMeetingError({
                  organizationId: meetingIds.orgId,
                  sessionId: dbSession.sessionId,
                  userId: userId,
                  errorType: 'leader_mismatch',
                  errorMessage: `User "${userName}" joined meeting but original facilitator "${dbSession.facilitatorName}" is not present. Meeting may have sync issues.`,
                  meetingType: meetingIds.meetingType,
                  severity: 'warning',
                  context: {
                    meetingCode,
                    joiningUser: userName,
                    originalFacilitator: dbSession.facilitatorName,
                    dbSessionId: dbSession.sessionId
                  }
                }).catch(err => console.error('Failed to log leader mismatch alert:', err));
              }
            }
          }
          
          meetings.set(meetingCode, {
            code: meetingCode,
            leader: syncedLeader,
            originalLeader: syncedOriginalLeader,
            leaderDisconnected: syncedLeaderDisconnected,
            participants: new Map(),
            ratings: new Map(),  // Initialize ratings Map
            currentRoute: initialRoute,
            currentSection: dbSession?.currentSection || null,  // Sync section from database
            scrollPosition: 0,
            createdAt: dbSession?.startTime || new Date(),
            timerStartTime: null,
            timerPaused: dbSession?.isPaused || false,
            dbSessionId: dbSession?.sessionId || null  // Store database session ID for reference
          });
          
          console.log(`🆕 [SYNC] Created in-memory meeting ${meetingCode} (synced with DB: ${!!dbSession})`);
        }

        const meeting = meetings.get(meetingCode);

        // Restore leadership if user was leader before disconnect
        if (shouldRestoreLeadership) {
          meeting.leader = userId;
          meeting.leaderDisconnected = false;  // Clear disconnected flag
          console.log(`👑 Leadership restored to ${userName} after reconnection`);
          // Notify all participants about leadership restoration
          this.io.to(meetingCode).emit('leader-reconnected', {
            leaderId: userId,
            leaderName: userName
          });
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

        // ============ SYNC VALIDATION ON RECONNECT ============
        // Fetch latest state from database to ensure reconnecting user gets accurate data
        let dbSyncedSection = meeting.currentSection;
        let dbSyncedTimerPaused = meeting.timerPaused;
        
        if (isReconnecting) {
          try {
            const syncIds = this.extractIdsFromMeetingCode(meetingCode);
            if (syncIds) {
              const client = await pool.connect();
              try {
                const syncResult = await client.query(`
                  SELECT current_section, is_paused, section_timings
                  FROM meeting_sessions
                  WHERE team_id = $1 AND is_active = true
                  ORDER BY created_at DESC
                  LIMIT 1
                `, [syncIds.teamId]);
                
                if (syncResult.rows.length > 0) {
                  const dbState = syncResult.rows[0];
                  dbSyncedSection = dbState.current_section || meeting.currentSection;
                  dbSyncedTimerPaused = dbState.is_paused ?? meeting.timerPaused;
                  
                  // Update in-memory state if database has newer data
                  if (dbSyncedSection && dbSyncedSection !== meeting.currentSection) {
                    console.log(`🔄 [RECONNECT-SYNC] Updating in-memory section from DB: ${meeting.currentSection} → ${dbSyncedSection}`);
                    meeting.currentSection = dbSyncedSection;
                  }
                  if (dbSyncedTimerPaused !== meeting.timerPaused) {
                    console.log(`🔄 [RECONNECT-SYNC] Updating in-memory pause state from DB: ${meeting.timerPaused} → ${dbSyncedTimerPaused}`);
                    meeting.timerPaused = dbSyncedTimerPaused;
                  }
                  
                  console.log(`✅ [RECONNECT-SYNC] User ${userName} reconnected with DB-synced state: section=${dbSyncedSection}, paused=${dbSyncedTimerPaused}`);
                }
              } finally {
                client.release();
              }
            }
          } catch (syncError) {
            console.error(`⚠️ [RECONNECT-SYNC] Failed to sync from database:`, syncError.message);
            // Continue with in-memory state if DB sync fails
          }
        }
        // ============ END SYNC VALIDATION ============

        // Send current state to joining user
        socket.emit('meeting-joined', {
          meeting: {
            code: meetingCode,
            leader: meeting.leader,
            originalLeader: meeting.originalLeader,
            leaderDisconnected: meeting.leaderDisconnected,
            currentRoute: meeting.currentRoute,
            currentSection: dbSyncedSection,
            scrollPosition: meeting.scrollPosition,
            timerStartTime: meeting.timerStartTime,
            timerPaused: dbSyncedTimerPaused
          },
          participants: Array.from(meeting.participants.values()),
          reconnected: isReconnecting,
          dbSynced: isReconnecting  // Flag to indicate this state was synced from DB
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
      socket.on('navigate', async (data) => {
        const userInfo = userSocketMap.get(socket.id);
        if (!userInfo) {
          console.log(`⚠️ [NAV] Navigate event received but no userInfo for socket ${socket.id}`);
          return;
        }

        const meeting = meetings.get(userInfo.meetingCode);
        if (!meeting) {
          console.log(`⚠️ [NAV] Navigate event but meeting not found: ${userInfo.meetingCode}`);
          return;
        }

        // Only leader can broadcast navigation
        if (meeting.leader !== userInfo.userId) {
          console.log(`⚠️ [NAV] Non-leader ${userInfo.userName} (${userInfo.userId}) tried to navigate. Leader is: ${meeting.leader}`);
          socket.emit('error', { message: 'Only leader can control navigation' });
          return;
        }

        // Update meeting state
        const previousSection = meeting.currentSection;
        meeting.currentRoute = data.route;
        meeting.currentSection = data.section;
        meeting.scrollPosition = data.scrollPosition || 0;

        // Get participant count for logging
        const participantCount = meeting.participants.size;
        const participantNames = Array.from(meeting.participants.values()).map(p => p.name).join(', ');

        // ALWAYS log navigation events for debugging (critical for Boyum meeting diagnosis)
        console.log(`📍 [NAV] Leader ${userInfo.userName} navigated: ${previousSection || 'start'} → ${data.section || 'none'}`);
        console.log(`📍 [NAV] Meeting: ${userInfo.meetingCode}, Participants (${participantCount}): ${participantNames}`);
        console.log(`📍 [NAV] Broadcasting navigation-update to ${participantCount - 1} followers`);

        // ============ AGGRESSIVE DATABASE SYNC ============
        // Sync section change to database immediately to prevent state loss
        try {
          const ids = this.extractIdsFromMeetingCode(userInfo.meetingCode);
          if (ids && data.section) {
            const client = await pool.connect();
            try {
              // Map frontend section IDs to backend IDs
              const sectionIdMap = {
                'good-news': 'segue',
                'good_news': 'segue',
                'priorities': 'rock_review',
                'priority': 'rock_review',
                'rocks': 'rock_review',
                'rock': 'rock_review',
                'todo-list': 'todos',
                'todo_list': 'todos',
                'todo': 'todos',
                'issues': 'ids',
                'issue': 'ids',
                'problems': 'ids',
                'problem': 'ids'
              };
              const mappedSection = sectionIdMap[data.section] || data.section;
              const mappedPreviousSection = previousSection ? (sectionIdMap[previousSection] || previousSection) : null;

              // Get the active session for this team
              const sessionResult = await client.query(`
                SELECT id, section_timings, current_section
                FROM meeting_sessions
                WHERE team_id = $1 AND is_active = true
                ORDER BY created_at DESC
                LIMIT 1
              `, [ids.teamId]);

              if (sessionResult.rows.length > 0) {
                const session = sessionResult.rows[0];
                let sectionTimings = session.section_timings || {};
                if (typeof sectionTimings === 'string') {
                  try { sectionTimings = JSON.parse(sectionTimings); } catch (e) { sectionTimings = {}; }
                }

                const now = new Date().toISOString();

                // End the previous section if it exists and is different
                if (mappedPreviousSection && mappedPreviousSection !== mappedSection && sectionTimings[mappedPreviousSection]) {
                  const prevData = sectionTimings[mappedPreviousSection];
                  if (prevData.started_at && !prevData.ended_at) {
                    prevData.ended_at = now;
                    prevData.actual = Math.floor(
                      (new Date(prevData.ended_at) - new Date(prevData.started_at)) / 1000
                    ) - (prevData.paused_duration || 0);
                    console.log(`📊 [DB-SYNC] Ended section ${mappedPreviousSection}: ${prevData.actual}s`);
                  }
                }

                // Start the new section if not already started
                if (!sectionTimings[mappedSection] || !sectionTimings[mappedSection].started_at) {
                  // Get section config for allocated time
                  const configResult = await client.query(`
                    SELECT sections FROM meeting_section_configs
                    WHERE organization_id = $1 AND meeting_type = 'weekly' AND is_default = true
                    LIMIT 1
                  `, [ids.orgId]);
                  
                  const sections = configResult.rows[0]?.sections || [
                    { id: 'segue', duration: 5 },
                    { id: 'scorecard', duration: 5 },
                    { id: 'rock_review', duration: 5 },
                    { id: 'headlines', duration: 5 },
                    { id: 'todos', duration: 5 },
                    { id: 'ids', duration: 60 },
                    { id: 'conclude', duration: 5 }
                  ];
                  const sectionConfig = sections.find(s => s.id === mappedSection);
                  const allocatedTime = (sectionConfig?.duration || 5) * 60;

                  sectionTimings[mappedSection] = {
                    allocated: allocatedTime,
                    started_at: now,
                    ended_at: null,
                    actual: 0,
                    paused_duration: 0
                  };
                  console.log(`📊 [DB-SYNC] Started section ${mappedSection}`);
                }

                // Update the database
                await client.query(`
                  UPDATE meeting_sessions
                  SET current_section = $1,
                      current_section_start = NOW(),
                      section_timings = $2,
                      updated_at = NOW()
                  WHERE id = $3
                `, [mappedSection, JSON.stringify(sectionTimings), session.id]);

                console.log(`📊 [DB-SYNC] Successfully synced navigation to database: ${mappedPreviousSection || 'start'} → ${mappedSection}`);
              } else {
                console.warn(`⚠️ [DB-SYNC] No active session found for team ${ids.teamId}`);
              }
            } finally {
              client.release();
            }
          }
        } catch (dbError) {
          console.error(`❌ [DB-SYNC] Failed to sync navigation to database:`, dbError.message);
          // Log the error but don't block the WebSocket broadcast
          logMeetingError({
            organizationId: this.extractIdsFromMeetingCode(userInfo.meetingCode)?.orgId,
            errorType: 'navigation_sync_failure',
            severity: 'warning',
            errorMessage: `Failed to sync navigation to database: ${dbError.message}`,
            context: {
              meetingCode: userInfo.meetingCode,
              previousSection,
              newSection: data.section,
              leader: userInfo.userName
            }
          });
        }
        // ============ END DATABASE SYNC ============

        // Broadcast to all participants
        socket.to(userInfo.meetingCode).emit('navigation-update', {
          route: data.route,
          section: data.section,
          scrollPosition: data.scrollPosition
        });
      });

      // Handle follow toggle
      socket.on('toggle-follow', (data) => {
        const userInfo = userSocketMap.get(socket.id);
        if (!userInfo) return;

        const meeting = meetings.get(userInfo.meetingCode);
        if (!meeting) return;

        const participant = meeting.participants.get(userInfo.userId);
        if (participant) {
          const wasFollowing = participant.isFollowing;
          participant.isFollowing = data.isFollowing;
          
          // Log follow status changes (important for diagnosing "not following" issues)
          console.log(`👁️ [FOLLOW] ${userInfo.userName} changed follow status: ${wasFollowing} → ${data.isFollowing} in meeting ${userInfo.meetingCode}`);
          
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

        // LEADER PROTECTION: Only the original leader can claim presenter role
        if (meeting.originalLeader && meeting.originalLeader !== userId) {
          console.warn(`⛔ User ${userData.userName} attempted to claim presenter but is not the original leader`);
          socket.emit('claim-presenter-denied', {
            reason: 'Only the original meeting leader can control this meeting'
          });
          return;
        }

        // Update leader (only if they are the original leader)
        meeting.leader = userId;
        meeting.leaderDisconnected = false;

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
          
          // Log to meeting alert system
          const userData = userSocketMap.get(socket.id);
          logMeetingError({
            organizationId: organizationId,
            errorType: 'ai_recording_start_failed',
            severity: 'error',
            errorMessage: `Failed to start AI recording: ${error.message}`,
            errorStack: error.stack,
            context: { transcriptId, meetingCode: userData?.meetingCode },
            meetingPhase: 'recording'
          }).catch(err => console.error('Failed to log AI recording error:', err));
          
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
                
                // Log to meeting alert system
                logMeetingError({
                  organizationId: userData?.organizationId,
                  errorType: 'ai_summary_generation_failed',
                  severity: 'error',
                  errorMessage: `AI summary generation failed: ${error.message}`,
                  context: { transcriptId, meetingId, meetingCode: userData?.meetingCode },
                  meetingPhase: 'summary'
                }).catch(err => console.error('Failed to log AI summary error:', err));
                
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
          
          // Log to meeting alert system
          const userData = userSocketMap.get(socket.id);
          logMeetingError({
            organizationId: userData?.organizationId,
            errorType: 'ai_recording_stop_failed',
            severity: 'error',
            errorMessage: `Failed to stop AI recording: ${error.message}`,
            errorStack: error.stack,
            context: { transcriptId, meetingId, meetingCode: userData?.meetingCode },
            meetingPhase: 'recording'
          }).catch(err => console.error('Failed to log AI recording error:', err));
          
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

    // Log disconnect with full context for debugging
    const remainingParticipants = meeting.participants.size - 1; // -1 because this user is leaving
    const participantNames = Array.from(meeting.participants.values())
      .filter(p => p.id !== userId)
      .map(p => p.name)
      .join(', ');
    
    console.log(`🔌 [DISCONNECT] ${userName} disconnecting from meeting ${meetingCode}`);
    console.log(`🔌 [DISCONNECT] Was leader: ${wasLeader}, Remaining participants (${remainingParticipants}): ${participantNames || 'none'}`);
    if (meeting.dbSessionId) {
      console.log(`🔌 [DISCONNECT] Meeting has active DB session: ${meeting.dbSessionId}`);
    }

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
  async finalizeUserRemoval(meetingCode, userId, userName, wasLeader) {
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

    // Clean up empty meetings - but check database session first
    if (meeting.participants.size === 0) {
      // CRITICAL FIX: Check if there's an active database session before deleting
      // This prevents the "split-brain" issue where the in-memory meeting is deleted
      // but the database session is still active, causing reconnection issues
      const meetingIds = this.extractIdsFromMeetingCode(meetingCode);
      let shouldPreserveMeeting = false;
      
      if (meetingIds) {
        try {
          const dbSession = await this.checkActiveDatabaseSession(meetingIds.orgId, meetingIds.teamId, meetingIds.meetingType);
          if (dbSession) {
            shouldPreserveMeeting = true;
            console.log(`📊 [SYNC] Preserving empty meeting ${meetingCode} - active database session exists (ID: ${dbSession.sessionId})`);
            // Keep the meeting shell but mark it as having no participants
            // This allows reconnecting users to join the same meeting
          }
        } catch (error) {
          console.error(`⚠️ [SYNC] Error checking database session for ${meetingCode}:`, error);
          // On error, preserve the meeting to be safe
          shouldPreserveMeeting = true;
        }
      }
      
      if (!shouldPreserveMeeting) {
        meetings.delete(meetingCode);
        console.log(`🗑️ Meeting ${meetingCode} ended (no participants, no active DB session)`);
      }
    } else if (wasLeader) {
      // LEADER PROTECTION: Never auto-transfer leadership
      // Instead, mark the leader as disconnected and notify participants
      meeting.leaderDisconnected = true;
      this.io.to(meetingCode).emit('leader-disconnected', {
        leaderId: userId,
        leaderName: userName,
        message: 'The meeting leader has disconnected. Waiting for them to reconnect...'
      });
      console.log(`⚠️ Leader ${userName} disconnected from meeting ${meetingCode} - NOT transferring leadership`);
      
      // ALERT: Send email notification when leader disconnects and doesn't return
      const meetingIds = this.extractIdsFromMeetingCode(meetingCode);
      if (meetingIds) {
        const participantNames = Array.from(meeting.participants.values()).map(p => p.name).join(', ');
        logMeetingError({
          organizationId: meetingIds.orgId,
          errorType: 'leader_disconnected_no_return',
          errorMessage: `Leader "${userName}" disconnected from meeting and did not return within the ${DISCONNECT_GRACE_PERIOD_MS/1000}s grace period. ${meeting.participants.size} participants are still in the meeting without a leader.`,
          meetingType: meetingIds.meetingType,
          participantsCount: meeting.participants.size,
          context: {
            meetingCode,
            leaderName: userName,
            leaderId: userId,
            remainingParticipants: participantNames,
            gracePeriodSeconds: DISCONNECT_GRACE_PERIOD_MS / 1000
          }
        }).catch(err => console.error('Failed to log leader disconnect alert:', err));
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

  // Check for active database session for a team
  // This syncs the WebSocket in-memory state with the database session
  async checkActiveDatabaseSession(orgId, teamId, meetingType) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT 
            ms.*,
            CONCAT(u.first_name, ' ', u.last_name) as facilitator_name
          FROM meeting_sessions ms
          LEFT JOIN users u ON ms.facilitator_id = u.id
          WHERE ms.team_id = $1 
            AND ms.meeting_type = $2 
            AND ms.is_active = true
          ORDER BY ms.created_at DESC
          LIMIT 1
        `, [teamId, meetingType]);

        if (result.rows.length > 0) {
          const session = result.rows[0];
          console.log(`📊 [SYNC] Found active database session for team ${teamId}: ${session.id}`);
          return {
            sessionId: session.id,
            facilitatorId: session.facilitator_id,
            facilitatorName: session.facilitator_name,
            startTime: session.start_time,
            isPaused: session.is_paused,
            currentSection: session.current_section
          };
        }
        return null;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error checking active database session:', error);
      return null;
    }
  }

  // Extract orgId and teamId from meeting code
  extractIdsFromMeetingCode(meetingCode) {
    try {
      // Determine meeting type suffix
      let meetingType = null;
      if (meetingCode.includes('-weekly-express')) meetingType = 'weekly';
      else if (meetingCode.includes('-weekly-accountability')) meetingType = 'weekly';
      else if (meetingCode.includes('-quarterly-planning')) meetingType = 'quarterly';
      else if (meetingCode.includes('-annual-planning')) meetingType = 'annual';
      
      if (!meetingType) return null;

      // Extract the suffix to remove
      let suffix;
      if (meetingCode.includes('-weekly-express')) suffix = '-weekly-express';
      else if (meetingCode.includes('-weekly-accountability')) suffix = '-weekly-accountability';
      else if (meetingCode.includes('-quarterly-planning')) suffix = '-quarterly-planning';
      else if (meetingCode.includes('-annual-planning')) suffix = '-annual-planning';

      const withoutSuffix = meetingCode.slice(0, -suffix.length);
      
      let orgId, teamId;
      if (withoutSuffix.length === 73) {
        // New format: orgId-teamId (73 characters: 36 + 1 + 36)
        orgId = withoutSuffix.slice(0, 36);
        teamId = withoutSuffix.slice(-36);
      } else if (withoutSuffix.length === 36) {
        // Legacy format: just teamId
        teamId = withoutSuffix;
        orgId = null;
      } else {
        return null;
      }

      return { orgId, teamId, meetingType };
    } catch (error) {
      console.error('Error extracting IDs from meeting code:', error);
      return null;
    }
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