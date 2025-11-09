import db from '../config/database.js';
import emailService from '../services/emailService.js';
import { recordMeetingConclusion } from '../services/todoReminderService.js';
import { isZeroUUID, isLeadershipTeam } from '../utils/teamUtils.js';
import transcriptionService from '../services/transcriptionService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// Create a new meeting record in database
export const createMeeting = async (req, res) => {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    const { 
      meetingType,      // 'weekly', 'quarterly', 'annual'
      title,
      agendaId,         
      facilitatorId,
      scheduledDate 
    } = req.body;
    
    const { orgId, teamId } = req.params;
    const userId = req.user.id;
    
    logger.debug('Creating meeting:', { orgId, teamId, meetingType, title });
    
    // Default values if not provided
    const meetingTitle = title || `${meetingType} Meeting`;
    const facilitator = facilitatorId || userId;
    const scheduled = scheduledDate || new Date();
    
    // Get or create agenda_id for this meeting type
    let agenda_id = agendaId;
    if (!agenda_id) {
      // Try to find existing agenda for this meeting type
      const agendaResult = await client.query(
        'SELECT id FROM meeting_agendas WHERE meeting_type = $1 AND organization_id = $2 AND (team_id = $3 OR team_id IS NULL) LIMIT 1',
        [meetingType, orgId, teamId]
      );
      
      if (agendaResult.rows.length > 0) {
        agenda_id = agendaResult.rows[0].id;
        logger.debug('Found existing agenda:', agenda_id);
      } else {
        // Create a default agenda if none exists
        const newAgendaResult = await client.query(
          `INSERT INTO meeting_agendas (id, organization_id, team_id, name, meeting_type, total_duration_minutes, is_template)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [uuidv4(), orgId, teamId, `Default ${meetingType} Agenda`, meetingType, 90, false]
        );
        agenda_id = newAgendaResult.rows[0].id;
        logger.debug('Created new agenda:', agenda_id);
      }
    }
    
    // Create meeting record
    const meetingId = uuidv4();
    const result = await client.query(
      `INSERT INTO meetings (
        id,
        organization_id, 
        team_id, 
        agenda_id,
        facilitator_id,
        title,
        scheduled_date,
        actual_start_time,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'in-progress', NOW(), NOW())
      RETURNING *`,
      [meetingId, orgId, teamId, agenda_id, facilitator, meetingTitle, scheduled]
    );
    
    await client.query('COMMIT');
    
    logger.info('Meeting created successfully:', { meetingId, title: meetingTitle, type: meetingType });
    
    res.json({ 
      success: true, 
      meeting: result.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating meeting:', error);
    res.status(500).json({ 
      error: 'Failed to create meeting',
      details: error.message 
    });
  } finally {
    client.release();
  }
};

// Conclude a meeting and send summary email
export const concludeMeeting = async (req, res) => {
  try {
    const { 
      meetingType,
      duration,
      rating,
      individualRatings, // Array of { userId, userName, rating }
      summary,
      attendees,
      metrics,
      todos,
      issues,
      notes,
      cascadingMessage,
      headlines,
      cascadingMessages,
      sendEmail = true // Default to true for backward compatibility
    } = req.body;

    console.log('📦 [Backend] Received cascadingMessages:', cascadingMessages);
    console.log('📦 [Backend] cascadingMessages type:', typeof cascadingMessages);
    console.log('📦 [Backend] cascadingMessages length:', cascadingMessages?.length);
    
    const userId = req.user.id;
    // CRITICAL: Use organizationId from URL params, NOT from user's JWT token
    // This ensures meeting summaries go to the correct organization
    const organizationId = req.params.orgId;
    let teamId = req.params.teamId;
    
    // Validate organizationId is provided
    if (!organizationId) {
      console.error('CRITICAL: No organization ID provided in request params');
      return res.status(400).json({ 
        error: 'Organization ID is required',
        message: 'Meeting cannot be concluded without organization context' 
      });
    }
    
    // CRITICAL VALIDATION: Team ID must NEVER be null or invalid
    if (teamId === 'null' || teamId === 'undefined' || !teamId) {
      console.error('CRITICAL ERROR: Invalid team ID detected:', teamId);
      console.error('Meeting conclusion BLOCKED to prevent email summaries going to wrong recipients');
      
      // Try to find the actual leadership team for this organization
      const leadershipResult = await db.query(
        'SELECT id FROM teams WHERE organization_id = $1 AND is_leadership_team = true LIMIT 1',
        [organizationId]
      );
      
      if (leadershipResult.rows.length > 0) {
        teamId = leadershipResult.rows[0].id;
        console.log('AUTO-RECOVERED: Found organization leadership team:', teamId);
      } else {
        // CRITICAL: BLOCK the meeting conclusion entirely
        console.error('FATAL: No valid team found for organization:', organizationId);
        return res.status(400).json({ 
          error: 'Invalid team context',
          message: 'Cannot conclude meeting without a valid team. Please select a team and try again.',
          details: 'This safety check prevents meeting summaries from being sent to the wrong recipients.'
        });
      }
    }
    
    // Additional validation: Ensure teamId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(teamId)) {
      console.error('CRITICAL ERROR: Team ID is not a valid UUID:', teamId);
      return res.status(400).json({ 
        error: 'Invalid team ID format',
        message: 'Team ID must be a valid UUID. Please select a valid team.',
        details: 'This safety check prevents meeting summaries from being sent to the wrong recipients.'
      });
    }
    
    // CRITICAL: Never allow zero UUID as it's shared across organizations
    if (isZeroUUID(teamId)) {
      console.error('CRITICAL ERROR: Attempted to use shared zero UUID:', teamId);
      return res.status(400).json({ 
        error: 'Invalid team ID',
        message: 'This team ID is not valid. Please select a different team.',
        details: 'The zero UUID cannot be used as it may send emails to wrong organizations.'
      });
    }

    logger.debug('Concluding meeting with VALIDATED teamId:', { meetingType, duration, rating, organizationId, teamId });

    logger.info('🏁 Starting meeting conclusion process');
    
    // 1. Update meeting status to completed - target specific meeting or latest in-progress
    const { specificMeetingId } = req.body; // New: allow specific meeting targeting
    
    let meetingUpdateResult;
    if (specificMeetingId) {
      // Target specific meeting by ID (for AI recordings)
      // First validate the meeting exists and is in a valid state
      const meetingValidation = await db.query(`
        SELECT id, status, created_at, title
        FROM meetings
        WHERE id = $1 AND organization_id = $2 AND team_id = $3
      `, [specificMeetingId, organizationId, teamId]);
      
      if (meetingValidation.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Meeting not found or access denied'
        });
      }
      
      const meeting = meetingValidation.rows[0];
      const meetingAge = Date.now() - new Date(meeting.created_at).getTime();
      const eightHours = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
      
      if (meeting.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          error: `Meeting is already ${meeting.status}`,
          details: 'This meeting has already been concluded'
        });
      }
      
      if (meetingAge > eightHours) {
        return res.status(400).json({
          success: false,
          error: 'Meeting too old to conclude',
          details: 'Meetings older than 8 hours cannot be manually concluded'
        });
      }
      
      meetingUpdateResult = await db.query(`
        UPDATE meetings
        SET 
          status = 'completed',
          completed_at = NOW(),
          actual_end_time = NOW(),
          updated_at = NOW()
        WHERE id = $1 AND organization_id = $2 AND team_id = $3
        RETURNING *
      `, [specificMeetingId, organizationId, teamId]);
      logger.info('🎯 Targeted specific meeting:', specificMeetingId);
    } else {
      // Improved: First find the meeting ID, then update it specifically
      // This gives us better control and debugging
      const findMeetingResult = await db.query(`
        SELECT id, created_at, team_id, organization_id
        FROM meetings
        WHERE organization_id = $1 
          AND team_id = $2
          AND status = 'in-progress'
        ORDER BY created_at DESC
        LIMIT 1
      `, [organizationId, teamId]);
      
      if (findMeetingResult.rows.length === 0) {
        logger.error('❌ No in-progress meeting found for conclude operation');
        logger.error('Search criteria:', { organizationId, teamId });
        return res.status(404).json({
          success: false,
          error: 'No active meeting found to conclude',
          details: `No in-progress meeting found for team ${teamId} in organization ${organizationId}`,
          debug: { organizationId, teamId, searchCriteria: 'organization_id + team_id + status=in-progress' }
        });
      }
      
      const targetMeetingId = findMeetingResult.rows[0].id;
      logger.info('🎯 Found target meeting:', targetMeetingId);
      
      // Now update the specific meeting
      meetingUpdateResult = await db.query(`
        UPDATE meetings
        SET 
          status = 'completed',
          completed_at = NOW(),
          actual_end_time = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [targetMeetingId]);
    }
    
    // CRITICAL: Check if the UPDATE actually found and updated a meeting
    if (meetingUpdateResult.rows.length === 0) {
      logger.error('❌ No meeting was updated! This is the root cause of the bug.');
      logger.error('Debug info:', { organizationId, teamId, specificMeetingId });
      return res.status(404).json({
        success: false,
        error: 'No active meeting found to conclude',
        details: `No in-progress meeting found for team ${teamId} in organization ${organizationId}`,
        debug: { organizationId, teamId, specificMeetingId }
      });
    }
    
    const updatedMeetingId = meetingUpdateResult.rows[0].id;
    logger.info('✅ Meeting marked as completed:', updatedMeetingId);

    // IMMEDIATE RESPONSE: Send success to user right away
    // Don't make them wait for AI processing or email sending
    res.json({
      success: true,
      message: 'Meeting concluded successfully',
      meetingId: updatedMeetingId,
      note: 'Summary email will be sent shortly'
    });
    
    // ASYNC BACKGROUND PROCESSING: Handle AI summary and email without blocking user
    // Wrap in setImmediate to ensure response is sent first
    setImmediate(async () => {
      try {
        logger.info('🔄 Starting background processing for meeting:', updatedMeetingId);
        
    // 2. Check if AI recording is active or recently completed
    logger.debug('Checking for active or recent AI recordings...');
    const transcriptCheck = await db.query(
      `SELECT mt.id, mt.status, mt.meeting_id, mt.created_at, mt.updated_at
       FROM meeting_transcripts mt
       LEFT JOIN meetings m ON mt.meeting_id = m.id  
       WHERE (m.organization_id = $1 OR mt.organization_id = $1)
         AND (
           mt.status IN ('processing', 'processing_ai') 
           OR (
             mt.status = 'completed' 
             AND mt.updated_at > NOW() - INTERVAL '5 minutes'
           )
         )
       ORDER BY mt.created_at DESC 
       LIMIT 1`,
      [organizationId]
    );

    let aiSummary = null;
    let usedFallbackSummary = false;
    
    if (transcriptCheck.rows.length > 0) {
      const transcript = transcriptCheck.rows[0];
      logger.info('🎤 AI recording found:', transcript.id, 'Status:', transcript.status);
      
      if (transcript.status === 'completed') {
        logger.info('Recording already completed, checking for AI summary...');
        // Skip stopping, go straight to waiting for AI summary with SHORT timeout
        try {
          aiSummary = await Promise.race([
            waitForAISummary(transcript.id, 0.17), // 10 seconds for better UX
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('AI summary timeout')), 10000) // 10 second timeout
            )
          ]);
        } catch (error) {
          logger.error('❌ AI summary generation failed for completed recording:', error.message);
          // Continue without AI summary - will use fallback later
        }
      } else {
        logger.info('Active recording detected, stopping transcription');
        
        try {
          // Stop the recording
          await transcriptionService.stopRealtimeTranscription(transcript.id);
          logger.info('✅ Recording stopped successfully');
          
          logger.info('⏳ Waiting up to 10 seconds for AI summary...');
          
          // Wait for AI summary with SHORT timeout for better UX
          // If AI isn't ready in 10 seconds, use fallback summary instead of making user wait
          try {
            aiSummary = await Promise.race([
              waitForAISummary(transcript.id, 0.17), // 10 seconds (0.17 minutes)
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AI summary timeout')), 10000) // 10 second timeout
              )
            ]);
          } catch (aiError) {
            logger.error('❌ AI summary generation failed:', aiError.message);
            // Continue without AI summary - will use fallback later
          }
          
        } catch (stopError) {
          logger.error('⚠️ Error stopping recording:', stopError);
          // Continue with conclude anyway - don't block meeting conclusion
        }
      }
    } else {
      logger.debug('No active or recent recording found - AI note taking was not enabled');
    }
    
    // Get user details BEFORE fallback summary (needed for userName)
    const userResult = await db.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    const userEmail = user?.email;
    const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
    
    // RESILIENCE: If AI summary failed (but AI note taking WAS enabled), generate fallback summary
    // Only generate fallback if a transcript exists (meaning AI was turned on)
    if (!aiSummary && transcriptCheck.rows.length > 0) {
      logger.info('📝 Generating fallback summary (AI was enabled but summary generation failed)');
      usedFallbackSummary = true;
      aiSummary = generateFallbackSummary({
        meetingType,
        duration,
        rating,
        attendees,
        todos,
        issues,
        notes,
        userName
      });
    }
    // If no transcript exists, aiSummary remains null and Executive Summary won't be shown

    // Get organization details
    const orgResult = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );
    const orgData = orgResult.rows[0];
    const orgName = orgData?.name || 'Your Organization';
    const themeColor = '#6366f1'; // Default theme color (no branding)

    // Get team/department name (we know teamId is valid at this point)
    const teamResult = await db.query(
      'SELECT name FROM teams WHERE id = $1',
      [teamId]
    );
    const teamName = teamResult.rows[0]?.name || 'Team';

    // User details already fetched earlier (before fallback summary generation)

    // Get team members' emails
    logger.debug('Getting team members for teamId:', teamId);
    
    let attendeeEmails = [];
    let teamMembersCount = 0;
    
    // Query team members (we know teamId is valid and not zero UUID at this point)
    const teamCheckResult = await db.query(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
      [teamId]
    );
    logger.debug('Team members count:', teamCheckResult.rows[0].count);
    teamMembersCount = parseInt(teamCheckResult.rows[0].count);
    
    // If no team_members entries, DO NOT send to entire organization!
    if (teamMembersCount === 0) {
      const isLeadershipResult = await db.query(
        'SELECT is_leadership_team FROM teams WHERE id = $1',
        [teamId]
      );
      
      if (isLeadershipResult.rows[0]?.is_leadership_team) {
        logger.warn('Leadership team has no explicit members - sending only to concluder to prevent spam');
        
        // CRITICAL CHANGE: Only send to the person who concluded the meeting
        // This prevents accidentally emailing 100+ employees
        const concluderResult = await db.query(
          `SELECT email FROM users WHERE id = $1`,
          [userId]
        );
        
        if (concluderResult.rows[0]?.email) {
          attendeeEmails = [concluderResult.rows[0].email];
          logger.debug('Meeting summary sent to concluder only:', concluderResult.rows[0].email);
        } else {
          attendeeEmails = [];
          logger.warn('No valid email for concluder, not sending summary');
        }
      } else {
        logger.warn('No team members found for team:', teamId);
        attendeeEmails = [];
      }
    } else {
      // Use team_members table
      const teamMembersResult = await db.query(
        `SELECT DISTINCT u.email, u.first_name, u.last_name 
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1
         AND u.email IS NOT NULL
         AND u.email != ''`,
        [teamId]
      );
      attendeeEmails = teamMembersResult.rows.map(row => row.email);
      logger.debug('Team member emails:', attendeeEmails);
    }

    logger.info('📧 Sending meeting summary to:', attendeeEmails.length, 'recipients');

    // Format the email data
    const meetingDate = new Date();
    const formattedDate = meetingDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Format duration - duration comes in as minutes from frontend
    const formatDuration = (durationInMinutes) => {
      // Convert minutes to total seconds for consistent calculation
      const totalMinutes = Math.floor(durationInMinutes);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours > 0 && minutes > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      }
      return '0 minutes';
    };

    // Get team member names for the email - match the logic used for emails
    let attendeeNames = [];
    if (!teamId || isZeroUUID(teamId)) {
      // For org-wide or when zero UUID detected, get all org users
      const leadershipCheckResult = await db.query(
        `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
        [teamId]
      );
      const leadershipMembersCount = parseInt(leadershipCheckResult.rows[0].count);
      
      if (leadershipMembersCount > 0) {
        const namesResult = await db.query(
          `SELECT DISTINCT u.first_name, u.last_name 
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY u.first_name, u.last_name`,
          [teamId]
        );
        attendeeNames = namesResult.rows.map(row => 
          `${row.first_name || ''} ${row.last_name || ''}`.trim()
        );
      } else {
        const namesResult = await db.query(
          `SELECT DISTINCT u.first_name, u.last_name 
           FROM users u
           WHERE u.organization_id = $1 
           AND u.email IS NOT NULL
           AND u.email != ''
           ORDER BY u.first_name, u.last_name`,
          [organizationId]
        );
        attendeeNames = namesResult.rows.map(row => 
          `${row.first_name || ''} ${row.last_name || ''}`.trim()
        );
      }
    } else {
      // Match the logic used for emails above
      if (teamMembersCount === 0) {
        // No team members found
        attendeeNames = [];
      } else {
        const namesResult = await db.query(
          `SELECT DISTINCT u.first_name, u.last_name 
           FROM team_members tm
           JOIN users u ON tm.user_id = u.id
           WHERE tm.team_id = $1
           ORDER BY u.first_name, u.last_name`,
          [teamId]
        );
        attendeeNames = namesResult.rows.map(row => 
          `${row.first_name || ''} ${row.last_name || ''}`.trim()
        );
      }
    }

    // Fetch quarterly priorities (rocks) completion status - same as getCurrentPriorities
    let rockCompletionPercentage = 0;
    let completedRocks = 0;
    let totalRocks = 0;
    
    try {
      // Get current active priorities for the specific team - filter by team_id
      const rocksQuery = `SELECT id, title, status, progress 
         FROM quarterly_priorities 
         WHERE organization_id = $1 
         AND team_id = $2
         AND deleted_at IS NULL`;
      
      const rocksResult = await db.query(
        rocksQuery,
        [organizationId, teamId]
      );
      
      totalRocks = rocksResult.rows.length;
      completedRocks = rocksResult.rows.filter(rock => 
        rock.status === 'complete' || rock.progress === 100
      ).length;
      
      if (totalRocks > 0) {
        rockCompletionPercentage = Math.round((completedRocks / totalRocks) * 100);
      }
      
      logger.debug(`Rock completion: ${completedRocks}/${totalRocks} (${rockCompletionPercentage}%)`);
    } catch (rockError) {
      logger.error('Failed to fetch quarterly priorities:', rockError);
      // Continue without rock data
    }
    
    // Cascading messages are now sent from frontend in request body
    // No need to query database - use the snapshot data from frontend
    // (cascadingMessages variable is already defined from req.body destructuring above)
    
    // Fetch open todos from database
    let openTodos = [];
    try {
      // We already validated teamId earlier, so we know it's valid
      const todoQuery = `SELECT t.*, u.first_name, u.last_name 
         FROM todos t
         LEFT JOIN users u ON t.assigned_to_id = u.id
         WHERE t.team_id = $1 
         AND t.status = 'incomplete' 
         AND t.deleted_at IS NULL
         ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;
      
      const todoResult = await db.query(
        todoQuery,
        [teamId]
      );
      
      console.log(`Found ${todoResult.rows.length} incomplete to-dos for team ${teamId}`);
      
      openTodos = todoResult.rows.map(todo => {
        const dueDateObj = todo.due_date ? new Date(todo.due_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day for fair comparison
        const isPastDue = dueDateObj && dueDateObj < today;
        
        return {
          title: todo.title || 'Untitled',
          assignee: todo.first_name && todo.last_name 
            ? `${todo.first_name} ${todo.last_name}`
            : todo.assigned_to_name || 'Unassigned',
          dueDate: dueDateObj ? dueDateObj.toLocaleDateString() : 'No due date',
          isPastDue: isPastDue
        };
      });
    } catch (todoError) {
      logger.error('Failed to fetch open todos:', todoError);
      // Continue with empty todos rather than failing
    }

    // Format todos from request body (if provided)
    const formattedNewTodos = (todos?.added || []).map(todo => ({
      title: todo.title || todo.todo || 'Untitled',
      assignee: todo.assigned_to_name || todo.assignee || todo.assigned_to || 'Unassigned',
      dueDate: todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'
    }));

    const formattedCompletedItems = (todos?.completed || []).map(todo => 
      todo.title || todo.todo || 'Untitled'
    );

    // Format issues - handle both array and object structure
    let resolvedIssues = [];
    let unresolvedIssues = [];
    
    if (Array.isArray(issues)) {
      // Legacy format: array of issues
      resolvedIssues = issues.filter(issue => issue.is_solved).map(issue => 
        issue.title || issue.issue || 'Untitled issue'
      );
      unresolvedIssues = issues.filter(issue => !issue.is_solved).map(issue => 
        issue.title || issue.issue || 'Untitled issue'
      );
    } else if (issues && typeof issues === 'object') {
      // New format: object with {discussed, created, solved}
      // Solved issues go to resolved
      resolvedIssues = (issues.solved || []).map(issue => 
        issue.title || issue.issue || 'Untitled issue'
      );
      // Only created issues go to unresolved (New Issues)
      // Discussed issues are for context only, not for email summary
      unresolvedIssues = (issues.created || [])
        .filter(issue => !issue.is_solved)
        .map(issue => issue.title || issue.issue || 'Untitled issue');
    }

    // Format meeting type for display
    const formattedMeetingType = meetingType === 'weekly' ? 'Weekly Accountability Meeting' : 
                                 meetingType === 'quarterly' ? 'Quarterly Planning Meeting' : 
                                 meetingType === 'annual' ? 'Annual Planning Meeting' :
                                 meetingType || 'Meeting';

    // Format meeting data for email template (same format as Meeting History)
    const emailData = {
      teamName,
      meetingType: formattedMeetingType,
      meetingDate: formattedDate,
      duration: duration || 60,
      rating: typeof rating === 'number' ? rating : null,
      facilitatorName: userName,
      organizationName: orgName,
      themeColor: themeColor,
      
      // AI Summary
      aiSummary: aiSummary,
      usedFallbackSummary: usedFallbackSummary,
      
      // Headlines in correct format
      headlines: req.body.headlines || { customer: [], employee: [] },
      
      // Cascading messages
      cascadingMessages: cascadingMessages || [],
      
      // Issues categorized
      issues: {
        solved: resolvedIssues || [],
        new: unresolvedIssues || []
      },
      
      // Todos categorized
      todos: {
        completed: formattedCompletedItems || [],
        new: formattedNewTodos || []
      },
      
      // Attendees
      attendees: attendeeNames || []
    };

    // SAFETY CHECK: Prevent mass email accidents
    const MAX_SAFE_EMAIL_COUNT = 20; // Reasonable limit for a team meeting
    
    if (attendeeEmails.length > MAX_SAFE_EMAIL_COUNT) {
      console.error(`SAFETY BLOCK: Attempted to send ${attendeeEmails.length} emails!`);
      console.error('This exceeds the safety limit of', MAX_SAFE_EMAIL_COUNT);
      console.error('Meeting summary blocked to prevent spam. Only sending to concluder.');
      
      // Override: Only send to the person who concluded the meeting
      const concluderEmail = userEmail;
      if (concluderEmail) {
        attendeeEmails = [concluderEmail];
        emailData.safetyNotice = `Note: Meeting summary was limited to prevent sending to ${attendeeEmails.length} recipients. Please configure team members properly.`;
      } else {
        attendeeEmails = [];
      }
    }
    
    // Send email to attendees only if requested (sendEmail parameter)
    let emailsSent = 0;
    if (sendEmail) {
      if (attendeeEmails.length > 0) {
        try {
          logger.info(`Sending meeting summary to ${attendeeEmails.length} recipients`);
          
          // Send using the unified template
          await emailService.sendMeetingSummary(attendeeEmails, emailData);
          
          emailsSent = attendeeEmails.length;
          logger.info('Meeting summary emails sent successfully');
        } catch (emailError) {
          logger.error('Failed to send meeting summary email:', emailError.message);
          // Continue with successful conclusion even if email fails
          // Note: Response already sent to user, this is background processing
          // Record meeting conclusion for reminder scheduling
          await recordMeetingConclusion(organizationId, teamId, meetingType, {
            meetingId: specificMeetingId,
            participantCount: individualRatings?.length || attendees?.length,
            durationMinutes: duration,
            attendees: attendees || []
          });
          // Don't return - continue with snapshot creation
        }
      } else {
        logger.warn('No email addresses found for team members');
      }
    }

    // Record meeting conclusion for reminder scheduling
    await recordMeetingConclusion(organizationId, teamId, meetingType, {
      meetingId: specificMeetingId,
      participantCount: individualRatings?.length || attendees?.length,
      durationMinutes: duration,
      attendees: attendees || []
    });

    // Create meeting snapshot for history
    try {
      console.log('🚨🚨🚨 SNAPSHOT CREATION START 🚨🚨🚨');
      logger.info('Creating meeting snapshot for history...');
      console.log('🔑 Snapshot context:', { organizationId, teamId, specificMeetingId, updatedMeetingId });
      
      // Get the meeting that was just concluded
      let meetingToSnapshot;
      const meetingIdToQuery = specificMeetingId || updatedMeetingId;
      if (meetingIdToQuery) {
        const result = await db.query(
          'SELECT * FROM meetings WHERE id = $1 AND organization_id = $2',
          [meetingIdToQuery, organizationId]
        );
        meetingToSnapshot = result.rows[0];
      }

      // Create snapshot whether we have a formal meeting record or not
      // This handles cases where meetings are concluded without being formally started
      if (meetingToSnapshot || (organizationId && teamId)) {
        // Calculate duration
        const durationMinutes = meetingToSnapshot?.actual_end_time && meetingToSnapshot?.actual_start_time
          ? Math.round((new Date(meetingToSnapshot.actual_end_time) - new Date(meetingToSnapshot.actual_start_time)) / 60000)
          : duration || null;

        // Build snapshot data from meeting conclusion data
        // CRITICAL: Filter todos and issues to only include items created/modified during this meeting
        const meetingStartTime = meetingToSnapshot?.created_at || meetingToSnapshot?.actual_start_time;
        
        console.log('🔍 [Snapshot Filter] Meeting start time:', meetingStartTime);
        console.log('🔍 [Snapshot Filter] Raw todos received:', todos);
        console.log('🔍 [Snapshot Filter] Raw issues received:', issues);
        
        // Filter todos to only include items from this meeting session
        let filteredTodos = todos || {};
        if (meetingStartTime && todos) {
          const meetingStart = new Date(meetingStartTime);
          
          // Filter "added" todos - only include items created during meeting
          if (todos.added && Array.isArray(todos.added)) {
            const originalCount = todos.added.length;
            filteredTodos.added = todos.added.filter(todo => {
              if (!todo.created_at) return false; // No timestamp = exclude
              const todoCreated = new Date(todo.created_at);
              return todoCreated >= meetingStart;
            });
            console.log(`🔍 [Snapshot Filter] Todos added: ${originalCount} → ${filteredTodos.added.length} (filtered by created_at >= ${meetingStart.toISOString()})`);
          }
          
          // Filter "completed" todos - only include items completed during meeting
          if (todos.completed && Array.isArray(todos.completed)) {
            const originalCount = todos.completed.length;
            filteredTodos.completed = todos.completed.filter(todo => {
              if (!todo.completed_at) return false; // No timestamp = exclude
              const todoCompleted = new Date(todo.completed_at);
              return todoCompleted >= meetingStart;
            });
            console.log(`🔍 [Snapshot Filter] Todos completed: ${originalCount} → ${filteredTodos.completed.length} (filtered by completed_at >= ${meetingStart.toISOString()})`);
          }
        } else {
          console.warn('⚠️ [Snapshot Filter] No meeting start time available - cannot filter todos by date');
        }
        
        // Filter issues to only include items created/resolved during meeting
        // Separate into 'new' and 'solved' categories like todos
        let filteredIssues = { new: [], solved: [] };
        if (meetingStartTime && issues && Array.isArray(issues)) {
          const meetingStart = new Date(meetingStartTime);
          const originalCount = issues.length;
          
          issues.forEach(issue => {
            let includedAsNew = false;
            let includedAsSolved = false;
            
            // Check if created during meeting
            if (issue.created_at) {
              const issueCreated = new Date(issue.created_at);
              if (issueCreated >= meetingStart) {
                filteredIssues.new.push(issue);
                includedAsNew = true;
              }
            }
            
            // Check if resolved during meeting (only if not already added as new)
            if (!includedAsNew && issue.is_solved && issue.resolved_at) {
              const issueResolved = new Date(issue.resolved_at);
              if (issueResolved >= meetingStart) {
                filteredIssues.solved.push(issue);
                includedAsSolved = true;
              }
            }
          });
          
          console.log(`🔍 [Snapshot Filter] Issues: ${originalCount} → ${filteredIssues.new.length} new + ${filteredIssues.solved.length} solved (filtered by created_at or resolved_at >= ${meetingStart.toISOString()})`);
        } else {
          console.warn('⚠️ [Snapshot Filter] No meeting start time available - cannot filter issues by date');
        }
        
        const snapshotData = {
          issues: filteredIssues,
          todos: filteredTodos,
          attendees: individualRatings || attendees || [],
          notes: notes || meetingToSnapshot?.notes || '',
          rating: rating || meetingToSnapshot?.rating,
          metrics: metrics || [],
          summary: summary || '',
          cascadingMessage: cascadingMessage || '',
          headlines: headlines || { customer: [], employee: [] },
          cascadingMessages: cascadingMessages || [],
          aiSummary: null  // Fixed: aiSummary was undefined
        };
        
        console.log('✅ [Snapshot Filter] Final snapshot data:', {
          todosAdded: filteredTodos.added?.length || 0,
          todosCompleted: filteredTodos.completed?.length || 0,
          issuesNew: filteredIssues.new?.length || 0,
          issuesSolved: filteredIssues.solved?.length || 0,
          headlinesCustomer: headlines?.customer?.length || 0,
          headlinesEmployee: headlines?.employee?.length || 0,
          cascadingMessages: cascadingMessages?.length || 0
        });
        
        // Create snapshot
        const snapshotParams = [
          meetingToSnapshot?.id || null,  // Can be null for informal meetings
          organizationId,
          teamId,
          meetingType || 'Weekly Accountability',
          meetingToSnapshot?.scheduled_date || new Date(),
          durationMinutes,
          rating,
          meetingToSnapshot?.facilitator_id || userId,
          JSON.stringify(snapshotData)
        ];
        
        const snapshotResult = await db.query(
          `INSERT INTO meeting_snapshots 
           (meeting_id, organization_id, team_id, meeting_type, meeting_date, 
            duration_minutes, average_rating, facilitator_id, snapshot_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (meeting_id) DO NOTHING
           RETURNING id`,
          snapshotParams
        );
        
        if (snapshotResult.rows.length > 0) {
          logger.info('Meeting snapshot created successfully:', snapshotResult.rows[0].id);
        } else {
          logger.debug('Snapshot already exists (ON CONFLICT)');
        }
      }
    } catch (snapshotError) {
      logger.error('Error creating meeting snapshot:', snapshotError.message);
      // Don't fail the entire conclusion if snapshot creation fails
    }

    // Response already sent immediately after marking meeting complete
    // This background processing completes asynchronously
    logger.info(`Background processing complete - Emails sent: ${emailsSent}`);
      
      } catch (bgError) {
        logger.error('Error in background processing:', bgError.message);
        // Don't crash - user already got success response
      }
    }); // End of setImmediate

  } catch (error) {
    logger.error('Error concluding meeting:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to conclude meeting',
      error: error.message
    });
  }
};

// Helper function to wait for AI summary
async function waitForAISummary(transcriptId, maxMinutes = 10) {
  const checkIntervalSeconds = 5;
  const maxAttempts = (maxMinutes * 60) / checkIntervalSeconds;
  
  console.log(`⏳ [WaitAI] Checking every ${checkIntervalSeconds}s for up to ${maxMinutes} minutes`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const aiSummary = await getAISummaryForTranscript(transcriptId);
    
    if (aiSummary) {
      const elapsedSeconds = attempt * checkIntervalSeconds;
      console.log(`✅ [WaitAI] AI summary ready after ${elapsedSeconds} seconds`);
      return aiSummary;
    }
    
    // Log progress every minute
    if (attempt % 12 === 0) {
      const elapsedMinutes = Math.floor(attempt / 12);
      console.log(`⏳ [WaitAI] Still waiting... ${elapsedMinutes} minute(s) elapsed`);
    }
    
    // Wait before next check
    await new Promise(resolve => setTimeout(resolve, checkIntervalSeconds * 1000));
  }
  
  console.log(`⚠️ [WaitAI] AI summary not ready after ${maxMinutes} minutes. Proceeding without it.`);
  return null;
}

// Helper function to get AI summary for transcript
async function getAISummaryForTranscript(transcriptId) {
  try {
    const result = await db.query(`
      SELECT 
        mas.id,
        mas.executive_summary,
        mas.action_items,
        mas.key_decisions,
        mas.issues_discussed,
        mt.word_count,
        mt.status as transcript_status
      FROM meeting_ai_summaries mas
      JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
      WHERE mt.id = $1
        AND mt.status = 'completed'
      ORDER BY mas.created_at DESC
      LIMIT 1
    `, [transcriptId]);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    return null;
    
  } catch (error) {
    logger.error('Error fetching AI summary:', error.message);
    return null;
  }
}

// Generate fallback summary when AI is not available
function generateFallbackSummary({ meetingType, duration, rating, attendees, todos, issues, notes, userName }) {
  const now = new Date();
  const attendeeList = attendees?.map(a => a.name || a.userName || 'Unknown').join(', ') || 'Not recorded';
  const avgRating = rating || 'Not rated';
  
  // Handle todos as either array or object {completed: [], added: []}
  let todosArray = [];
  if (Array.isArray(todos)) {
    todosArray = todos;
  } else if (todos && typeof todos === 'object') {
    // Combine completed and added todos
    todosArray = [...(todos.completed || []), ...(todos.added || [])];
  }
  
  // Handle issues as either array or object {discussed: [], created: [], solved: []}
  let issuesArray = [];
  if (Array.isArray(issues)) {
    issuesArray = issues;
  } else if (issues && typeof issues === 'object') {
    // Combine discussed, created, and solved issues
    issuesArray = [...(issues.discussed || []), ...(issues.created || []), ...(issues.solved || [])];
  }
  
  const todoCount = todosArray.length || 0;
  const issueCount = issuesArray.length || 0;
  
  return {
    executive_summary: `
${meetingType || 'Meeting'} Summary
Date: ${now.toLocaleDateString()}
Duration: ${duration || 'Not recorded'} minutes
Facilitator: ${userName || 'Not recorded'}
Attendees: ${attendeeList}
Rating: ${avgRating} / 5

Key Items Discussed:
- ${todoCount} To-Do items reviewed
- ${issueCount} Issues addressed
- ${notes ? 'Meeting notes provided' : 'No additional notes recorded'}

${notes ? `\nNotes:\n${notes}` : ''}

---
Note: AI-generated summary was not available for this meeting. This summary was automatically generated from meeting data.
    `.trim(),
    key_takeaways: [
      `Meeting completed with ${todoCount} to-dos and ${issueCount} issues discussed`,
      notes ? 'Additional meeting notes were provided' : 'No additional notes recorded',
      `Team rated the meeting ${avgRating}/5`
    ].filter(Boolean),
    action_items: todosArray.map(todo => todo.description || todo.text || 'Action item'),
    participants: attendees?.map(a => a.name || a.userName) || [],
    meeting_effectiveness: avgRating ? `${avgRating}/5` : 'Not rated'
  };
}