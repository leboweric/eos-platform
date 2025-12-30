import { pool } from '../config/database.js';
import { logMeetingError } from '../services/meetingAlertService.js';

// Start a new meeting session
export const startSession = async (req, res) => {
  const { team_id: teamId, organization_id: orgId, meeting_type } = req.body;
  const userId = req.user.id || req.user.userId;
  
  const client = await pool.connect();
  try {
    // Check team membership
    const memberCheck = await client.query(
      `SELECT user_id, team_id, role
       FROM team_members 
       WHERE user_id = $1 AND team_id = $2`,
      [userId, teamId]
    );
    
    if (memberCheck.rows.length === 0) {
      console.log(`Access denied: User ${userId} not member of team ${teamId}`);
      return res.status(403).json({
        success: false,
        error: 'TEAM_MEMBERSHIP_REQUIRED',
        message: 'You cannot start a meeting for a team you are not a member of.'
      });
    }

    // Check if there's already an active session for this team
    const existingSession = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds
      FROM meeting_sessions ms
      WHERE ms.team_id = $1 
        AND ms.meeting_type = $2 
        AND ms.is_active = true
      ORDER BY ms.created_at DESC
      LIMIT 1
    `, [teamId, meeting_type]);

    if (existingSession.rows.length > 0) {
      // Return existing session with full details
      return res.json({
        session: existingSession.rows[0],
        message: 'Resuming existing session',
        resumed: true
      });
    }

    // Create new session
    const result = await client.query(`
      INSERT INTO meeting_sessions (
        organization_id,
        team_id,
        meeting_type,
        facilitator_id,
        start_time,
        is_active,
        is_paused,
        total_paused_duration
      ) VALUES ($1, $2, $3, $4, NOW(), true, false, 0)
      RETURNING *
    `, [orgId, teamId, meeting_type, userId]);

    res.status(201).json({
      session: result.rows[0],
      message: 'Meeting session started',
      resumed: false
    });
  } catch (error) {
    console.error('Error starting meeting session:', error);
    
    // Log to meeting alert system
    await logMeetingError({
      organizationId: orgId,
      userId,
      errorType: 'start_failed',
      errorMessage: error.message,
      errorStack: error.stack,
      context: { teamId, meeting_type, userAgent: req.headers['user-agent'] },
      meetingType: meeting_type
    }).catch(err => console.error('Failed to log meeting error:', err));
    
    res.status(500).json({ error: 'Failed to start meeting session' });
  } finally {
    client.release();
  }
};

// Pause a meeting session
export const pauseSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // Update session to paused state
    const sessionResult = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_paused = true,
        last_pause_time = NOW(),
        updated_at = NOW()
      WHERE id = $1 AND is_active = true AND is_paused = false
      RETURNING *
    `, [id]);

    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Active session not found or already paused' });
    }

    // Create pause event
    await client.query(`
      INSERT INTO meeting_pause_events (
        session_id,
        pause_time,
        paused_by,
        reason
      ) VALUES ($1, NOW(), $2, $3)
    `, [id, user_id, reason || null]);

    await client.query('COMMIT');

    res.json({
      session: sessionResult.rows[0],
      message: 'Meeting paused'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error pausing meeting session:', error);
    res.status(500).json({ error: 'Failed to pause meeting session' });
  } finally {
    client.release();
  }
};

// Resume a meeting session
export const resumeSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    await client.query('BEGIN');

    // Get current session state
    const currentSession = await client.query(`
      SELECT * FROM meeting_sessions
      WHERE id = $1 AND is_active = true AND is_paused = true
    `, [id]);

    if (currentSession.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Paused session not found' });
    }

    const session = currentSession.rows[0];
    
    // Calculate pause duration
    const pauseDuration = Math.floor(
      (Date.now() - new Date(session.last_pause_time).getTime()) / 1000
    );

    // Update session to resumed state
    const sessionResult = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_paused = false,
        last_resume_time = NOW(),
        total_paused_duration = total_paused_duration + $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *, calculate_active_duration(id) as active_duration_seconds
    `, [pauseDuration, id]);

    // Update the pause event with resume info
    await client.query(`
      UPDATE meeting_pause_events
      SET 
        resume_time = NOW(),
        resumed_by = $1,
        duration_seconds = $2
      WHERE id = (
        SELECT id 
        FROM meeting_pause_events 
        WHERE session_id = $3
          AND resume_time IS NULL
        ORDER BY pause_time DESC
        LIMIT 1
      )
    `, [user_id, pauseDuration, id]);

    await client.query('COMMIT');

    res.json({
      session: sessionResult.rows[0],
      message: 'Meeting resumed'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resuming meeting session:', error);
    res.status(500).json({ error: 'Failed to resume meeting session' });
  } finally {
    client.release();
  }
};

// Get current session status
export const getSessionStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name,
        (
          SELECT COUNT(*) 
          FROM meeting_pause_events 
          WHERE session_id = ms.id
        ) as pause_count
      FROM meeting_sessions ms
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get pause history
    const pauseHistory = await client.query(`
      SELECT 
        mpe.*,
        CONCAT(pu.first_name, ' ', pu.last_name) as paused_by_name,
        CONCAT(ru.first_name, ' ', ru.last_name) as resumed_by_name
      FROM meeting_pause_events mpe
      LEFT JOIN users pu ON mpe.paused_by = pu.id
      LEFT JOIN users ru ON mpe.resumed_by = ru.id
      WHERE mpe.session_id = $1
      ORDER BY mpe.pause_time DESC
    `, [id]);

    res.json({
      session: result.rows[0],
      pauseHistory: pauseHistory.rows
    });
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  } finally {
    client.release();
  }
};

// Update session section
export const updateSessionSection = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { section } = req.body;

    const result = await client.query(`
      UPDATE meeting_sessions
      SET 
        current_section = $1,
        current_section_start = NOW(),
        updated_at = NOW()
      WHERE id = $2 AND is_active = true
      RETURNING *
    `, [section, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json({
      session: result.rows[0],
      message: `Section changed to ${section}`
    });
  } catch (error) {
    console.error('Error updating session section:', error);
    res.status(500).json({ error: 'Failed to update session section' });
  } finally {
    client.release();
  }
};

// End a meeting session
export const endSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // Calculate final duration before ending
    const durationResult = await client.query(`
      SELECT calculate_active_duration($1) as final_duration_seconds
    `, [id]);

    const result = await client.query(`
      UPDATE meeting_sessions
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        ...result.rows[0],
        final_duration_seconds: durationResult.rows[0].final_duration_seconds
      },
      message: 'Meeting session ended'
    });
  } catch (error) {
    console.error('Error ending meeting session:', error);
    res.status(500).json({ error: 'Failed to end meeting session' });
  } finally {
    client.release();
  }
};

// Get active session for a team
export const getActiveSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { team_id, meeting_type } = req.query;

    const result = await client.query(`
      SELECT 
        ms.*,
        calculate_active_duration(ms.id) as active_duration_seconds,
        CONCAT(u.first_name, ' ', u.last_name) as facilitator_name
      FROM meeting_sessions ms
      LEFT JOIN users u ON ms.facilitator_id = u.id
      WHERE ms.team_id = $1 
        AND ms.meeting_type = $2 
        AND ms.is_active = true
      ORDER BY ms.created_at DESC
      LIMIT 1
    `, [team_id, meeting_type]);

    if (result.rows.length === 0) {
      return res.json({ session: null });
    }

    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  } finally {
    client.release();
  }
};

// Auto-save timer state (called periodically from frontend)
export const saveTimerState = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { elapsed_seconds } = req.body;

    // Just update the updated_at to keep session alive
    const result = await client.query(`
      UPDATE meeting_sessions
      SET updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving timer state:', error);
    res.status(500).json({ error: 'Failed to save timer state' });
  } finally {
    client.release();
  }
};

// Check if user can start a meeting for a specific team
export const canStartMeetingForTeam = async (req, res) => {
  const client = await pool.connect();
  try {
    const { teamId } = req.params;
    const userId = req.user.id || req.user.userId;

    // Check if user is explicit member of this specific team
    const membershipQuery = `
      SELECT tm.id, tm.role
      FROM team_members tm
      WHERE tm.user_id = $1 
      AND tm.team_id = $2
    `;

    const result = await client.query(membershipQuery, [userId, teamId]);
    
    const canStart = result.rows.length > 0;

    res.json({ 
      canStart,
      teamId,
      membership: result.rows[0] || null
    });

  } catch (error) {
    console.error('Error checking meeting start permission:', error);
    res.status(500).json({ 
      error: 'Failed to check permissions',
      canStart: false 
    });
  } finally {
    client.release();
  }
};

// Update a meeting session (for concluding meetings)
export const updateMeetingSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: sessionId } = req.params;
    const { is_active, sendEmail, meetingData } = req.body;
    
    console.log('🏁 [Conclude] Updating meeting session:', sessionId);
    console.log('🏁 [Conclude] is_active:', is_active, 'sendEmail:', sendEmail);
    console.log('🏁 [Conclude] Has meeting data:', !!meetingData);
    
    // Update the meeting session
    const sessionResult = await client.query(
      `UPDATE meeting_sessions 
       SET is_active = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [is_active, sessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      console.log('❌ [Conclude] Meeting session not found:', sessionId);
      return res.status(404).json({ error: 'Meeting session not found' });
    }
    
    const session = sessionResult.rows[0];
    console.log('✅ [Conclude] Meeting session updated successfully');
    
    // If concluding the meeting (is_active = false) and we have meeting data, process it
    if (is_active === false && meetingData) {
      console.log('🏁 [Conclude] Processing meeting conclusion with full data');
      
      try {
        // Find the associated meeting record (closest to session start time)
        const meetingResult = await client.query(
          `SELECT id, organization_id, team_id, facilitator_id 
           FROM meetings 
           WHERE team_id = $1 
             AND title = 'AI Recording Session'
             AND status = 'in-progress'
             AND created_at >= ($2::timestamp - INTERVAL '5 minutes')
             AND created_at <= ($2::timestamp + INTERVAL '5 minutes')
           ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - $2::timestamp))) ASC
           LIMIT 1`,
          [session.team_id, session.start_time]
        );
        
        if (meetingResult.rows.length === 0) {
          console.warn('⚠️ [Conclude] No associated meeting found for session:', sessionId);
        } else {
          const meeting = meetingResult.rows[0];
          console.log('✅ [Conclude] Found associated meeting:', meeting.id);
          
          // Update meeting status and end time
          await client.query(
            `UPDATE meetings 
             SET status = 'completed',
                 actual_end_time = NOW(),
                 completed_at = NOW(),
                 rating = $1,
                 total_duration_minutes = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [meetingData.rating, meetingData.duration, meeting.id]
          );
          console.log('✅ [Conclude] Meeting marked as completed');
          
          // DEBUG: Log received meetingData structure
          console.log('🔍 [Debug] Raw meetingData received:', JSON.stringify(meetingData, null, 2));
          console.log('🔍 [Debug] meetingData.todos:', meetingData.todos);
          console.log('🔍 [Debug] meetingData.issues:', meetingData.issues);
          
          // DEBUG: Log todos received from frontend
          console.log('🔍 [Debug] Todos received from frontend:', {
            completed: meetingData.todos?.completed,
            added: meetingData.todos?.added
          });
          
          // DEBUG: Log individual todo timestamps
          if (meetingData.todos?.completed) {
            console.log('🔍 [Debug] Completed todos with timestamps:');
            meetingData.todos.completed.forEach((todo, index) => {
              console.log(`  ${index + 1}. "${todo.title}" - completed_at: ${todo.completed_at} (type: ${typeof todo.completed_at})`);
            });
          }
          
          if (meetingData.todos?.added) {
            console.log('🔍 [Debug] Added todos with timestamps:');
            meetingData.todos.added.forEach((todo, index) => {
              console.log(`  ${index + 1}. "${todo.title}" - created_at: ${todo.created_at} (type: ${typeof todo.created_at})`);
            });
          }
          
          // DEBUG: Log individual issue timestamps
          if (meetingData.issues) {
            console.log('🔍 [Debug] Issues with timestamps:');
            meetingData.issues.forEach((issue, index) => {
              console.log(`  ${index + 1}. "${issue.title}" - solved: ${issue.is_solved}, created_at: ${issue.created_at} (type: ${typeof issue.created_at}), resolved_at: ${issue.resolved_at} (type: ${typeof issue.resolved_at})`);
            });
          }
          
          // Get today's date at midnight for comparison
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          console.log('🔍 [Debug] Today threshold:', today.toISOString());

          // Helper function to check if a date is today
          const isToday = (dateString) => {
            if (!dateString) return false;
            const date = new Date(dateString);
            const isAfterToday = date >= today;
            console.log(`🔍 [Debug] Checking if "${dateString}" is today: ${isAfterToday} (parsed as: ${date.toISOString()})`);
            return isAfterToday;
          };

          // Filter todos to only those completed or created TODAY
          const completedTodosToday = (meetingData.todos?.completed || []).filter(todo => 
            isToday(todo.completed_at)
          );

          const newTodosToday = (meetingData.todos?.added || []).filter(todo => 
            isToday(todo.created_at)
          );

          // Filter issues to only those resolved or created TODAY
          const solvedIssuesToday = (meetingData.issues || [])
            .filter(issue => issue.is_solved && isToday(issue.resolved_at))
            .map(issue => ({
              id: issue.id,
              title: issue.title,
              owner_name: issue.owner_name,
              resolved_at: issue.resolved_at
            }));

          const newIssuesToday = (meetingData.issues || [])
            .filter(issue => !issue.is_solved && isToday(issue.created_at))
            .map(issue => ({
              id: issue.id,
              title: issue.title,
              owner_name: issue.owner_name,
              created_at: issue.created_at
            }));

          console.log(`📊 [Filtering] Today's changes - Completed todos: ${completedTodosToday.length}, New todos: ${newTodosToday.length}, Solved issues: ${solvedIssuesToday.length}, New issues: ${newIssuesToday.length}`);

          // Create snapshot with filtered data - only TODAY's changes
          const snapshotData = {
            title: 'AI Recording Session',
            status: 'completed',
            
            // Only todos from TODAY
            todos: {
              completed: completedTodosToday.map(todo => ({
                title: todo.title,
                completed_at: todo.completed_at,
                assigned_to_name: todo.assigned_to_name
              })),
              added: newTodosToday.map(todo => ({
                title: todo.title,
                assignee: todo.assignee || todo.assigned_to_name,
                dueDate: todo.due_date,
                created_at: todo.created_at
              }))
            },
            
            // Only issues from TODAY
            issues: {
              solved: solvedIssuesToday,
              new: newIssuesToday
            },
            
            headlines: meetingData.headlines || { customer: [], employee: [] },
            cascadingMessages: meetingData.cascadingMessages || [],
            rating: meetingData.rating,
            duration: meetingData.duration,
            participantRatings: meetingData.participantRatings || [],
            notes: '',
            attendees: [] // Will be populated from team members
          };
          
          await client.query(
            `INSERT INTO meeting_snapshots 
             (meeting_id, organization_id, team_id, meeting_type, meeting_date, 
              duration_minutes, average_rating, facilitator_id, snapshot_data)
             VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)`,
            [
              meeting.id,
              meeting.organization_id,
              meeting.team_id,
              session.meeting_type,
              meetingData.duration,
              meetingData.rating,
              meeting.facilitator_id,
              JSON.stringify(snapshotData)
            ]
          );
          console.log('✅ [Conclude] Meeting snapshot created');
          
          // Note: Email will be sent by AI summary service when transcription completes
          // The AI service will now be able to find the snapshot and include all meeting data
        }
      } catch (conclusionError) {
        console.error('❌ [Conclude] Error processing meeting conclusion:', conclusionError);
        
        // Log critical error - potential data loss
        await logMeetingError({
          organizationId: session.organization_id,
          sessionId: sessionId,
          userId: req.user?.id,
          errorType: 'conclude_failed',
          severity: 'critical',
          errorMessage: conclusionError.message,
          errorStack: conclusionError.stack,
          context: { 
            meetingData: meetingData ? { 
              hasTodos: !!meetingData.todos,
              hasIssues: !!meetingData.issues,
              hasHeadlines: !!meetingData.headlines,
              rating: meetingData.rating
            } : null,
            sendEmail 
          },
          meetingType: session.meeting_type,
          meetingPhase: 'conclusion'
        }).catch(err => console.error('Failed to log meeting error:', err));
        
        // Don't fail the whole request - session was updated successfully
      }
    }
    
    res.json({ 
      success: true, 
      data: sessionResult.rows[0],
      message: 'Meeting session concluded successfully'
    });
  } catch (error) {
    console.error('❌ [Conclude] Error updating meeting session:', error);
    
    // Log critical error
    const { id: sessionId } = req.params;
    const { meetingData } = req.body;
    await logMeetingError({
      organizationId: req.user?.organizationId,
      sessionId: sessionId,
      userId: req.user?.id,
      errorType: 'conclude_failed',
      severity: 'critical',
      errorMessage: error.message,
      errorStack: error.stack,
      context: { 
        phase: 'session_update',
        hasMeetingData: !!meetingData
      },
      meetingPhase: 'conclusion'
    }).catch(err => console.error('Failed to log meeting error:', err));
    
    res.status(500).json({ error: 'Failed to update meeting session' });
  } finally {
    client.release();
  }
};