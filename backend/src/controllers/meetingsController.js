import db from '../config/database.js';
import emailService from '../services/emailService.js';
import { recordMeetingConclusion } from '../services/todoReminderService.js';
import { isZeroUUID, isLeadershipTeam } from '../utils/teamUtils.js';
import transcriptionService from '../services/transcriptionService.js';
import logger from '../utils/logger.js';

// Conclude a meeting and send summary email
export const concludeMeeting = async (req, res) => {
  try {
    logger.debug('Request params:', req.params);
    logger.debug('Request URL:', req.url);
    logger.debug('Request baseUrl:', req.baseUrl);
    
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
      sendEmail = true // Default to true for backward compatibility
    } = req.body;

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
    if (transcriptCheck.rows.length > 0) {
      const transcript = transcriptCheck.rows[0];
      logger.info('🎤 AI recording found:', transcript.id, 'Status:', transcript.status);
      
      if (transcript.status === 'completed') {
        logger.info('Recording already completed, checking for AI summary...');
        // Skip stopping, go straight to waiting for AI summary
        aiSummary = await waitForAISummary(transcript.id, 2); // Shorter wait for completed recordings
      } else {
        logger.info('Active recording detected, stopping transcription');
        
        try {
          // Stop the recording
          await transcriptionService.stopRealtimeTranscription(transcript.id);
          logger.info('✅ Recording stopped successfully');
          
          logger.info('⏳ Waiting up to 10 minutes for AI summary...');
          
          // Wait for AI summary (up to 10 minutes)
          aiSummary = await waitForAISummary(transcript.id, 10);
          
        } catch (stopError) {
          logger.error('⚠️ Error stopping recording:', stopError);
          // Continue with conclude anyway - don't block meeting conclusion
        }
      }
    } else {
      logger.debug('No active or recent recording found');
    }

    // Get organization details
    const orgResult = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );
    const organizationName = orgResult.rows[0]?.name || 'Your Organization';

    // Get team/department name (we know teamId is valid at this point)
    const teamResult = await db.query(
      'SELECT name FROM teams WHERE id = $1',
      [teamId]
    );
    const teamName = teamResult.rows[0]?.name || 'Team';

    // Get user details
    const userResult = await db.query(
      'SELECT email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];
    const userEmail = user?.email;
    const userName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

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
        console.log('WARNING: Leadership team has no explicit members');
        console.log('SAFETY: Only sending to meeting concluder to prevent spam');
        
        // CRITICAL CHANGE: Only send to the person who concluded the meeting
        // This prevents accidentally emailing 100+ employees
        const concluderResult = await db.query(
          `SELECT email FROM users WHERE id = $1`,
          [userId]
        );
        
        if (concluderResult.rows[0]?.email) {
          attendeeEmails = [concluderResult.rows[0].email];
          console.log('Meeting summary will only be sent to concluder:', concluderResult.rows[0].email);
        } else {
          attendeeEmails = [];
          console.log('No valid email for concluder, not sending summary');
        }
      } else {
        console.log('No team members found for team:', teamId);
        console.log('SAFETY: Not sending email summary');
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
      
      console.log(`Rock completion: ${completedRocks} of ${totalRocks} (${rockCompletionPercentage}%)`);
    } catch (rockError) {
      console.error('Failed to fetch quarterly priorities:', rockError);
      // Continue without rock data
    }
    
    // Fetch cascading messages from today for this specific team
    let cascadingMessages = [];
    try {
      // Get today's cascading messages from this specific team
      const cascadeQuery = `
        SELECT 
          cm.id,
          cm.message,
          COALESCE(
            STRING_AGG(t.name, ', ' ORDER BY t.name),
            'All Teams'
          ) as recipient_teams
        FROM cascading_messages cm
        LEFT JOIN cascading_message_recipients cmr ON cm.id = cmr.message_id
        LEFT JOIN teams t ON cmr.to_team_id = t.id
        WHERE cm.organization_id = $1
        AND cm.from_team_id = $2
        AND cm.meeting_date = CURRENT_DATE
        GROUP BY cm.id, cm.message, cm.created_at
        ORDER BY cm.created_at DESC
      `;
      
      const cascadeResult = await db.query(cascadeQuery, [organizationId, teamId]);
      
      console.log(`Found ${cascadeResult.rows.length} cascading messages from today for team ${teamId}`);
      
      cascadingMessages = cascadeResult.rows.map(msg => ({
        message: msg.message,
        recipientTeams: msg.recipient_teams
      }));
    } catch (cascadeError) {
      console.error('Failed to fetch cascading messages:', cascadeError);
      // Continue without cascading messages
    }
    
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
      console.error('Failed to fetch open todos:', todoError);
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

    // Format issues - separate resolved vs unresolved
    const resolvedIssues = (issues || []).filter(issue => issue.is_solved).map(issue => 
      issue.title || issue.issue || 'Untitled issue'
    );
    const unresolvedIssues = (issues || []).filter(issue => !issue.is_solved).map(issue => 
      issue.title || issue.issue || 'Untitled issue'
    );

    // Format meeting type for display
    const formattedMeetingType = meetingType === 'weekly' ? 'Weekly Accountability Meeting' : 
                                 meetingType === 'quarterly' ? 'Quarterly Planning Meeting' : 
                                 meetingType || 'Meeting';

    const emailData = {
      meetingType: formattedMeetingType,
      teamName,
      meetingDate: formattedDate,
      duration: formatDuration(duration || 0),
      rating: typeof rating === 'number' ? rating : null,
      individualRatings: individualRatings || [], // Array of participant ratings
      organizationName,
      organizationId: organizationId, // Add organization ID for AI summary lookup
      aiSummary: aiSummary, // Include AI summary if available
      concludedBy: userName,
      summary: summary || '',
      metrics: metrics || {},
      openTodos: openTodos, // Primary focus: all open todos
      completedItems: formattedCompletedItems,
      newTodos: formattedNewTodos,
      resolvedIssues: resolvedIssues, // Issues marked as solved
      unresolvedIssues: unresolvedIssues, // Issues still open
      cascadingMessages: cascadingMessages, // Add cascading messages
      notes: notes || '',
      // Additional fields requested by client
      attendees: attendeeNames,
      rockCompletionPercentage: rockCompletionPercentage,
      completedRocks: completedRocks,
      totalRocks: totalRocks,
      headlines: req.body.headlines || {} // Pass headlines from frontend
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
      console.log('🔍 [Backend] Email requested, proceeding with email sending...');
      if (attendeeEmails.length > 0) {
        try {
          console.log('Attempting to send email to', attendeeEmails.length, 'recipients');
          console.log('Recipients:', attendeeEmails);
          
          // Send to each email address
          for (const email of attendeeEmails) {
            await emailService.sendEmail(email, 'meetingSummary', emailData);
          }
          
          emailsSent = attendeeEmails.length;
          console.log('Meeting summary emails sent successfully');
        } catch (emailError) {
          console.error('Failed to send meeting summary email:', emailError);
          console.error('Email error details:', emailError.message, emailError.stack);
          // Continue with successful conclusion even if email fails
          // Record meeting conclusion for reminder scheduling
          await recordMeetingConclusion(organizationId, teamId, meetingType);

          return res.json({
            success: true,
            message: 'Meeting concluded successfully (email delivery failed)',
            error: `Email failed: ${emailError.message}`,
            emailsSent: 0
          });
        }
      } else {
        console.warn('No email addresses found for team members');
      }
    } else {
      console.log('🔍 [Backend] Email not requested, skipping email sending');
    }

    // Record meeting conclusion for reminder scheduling
    await recordMeetingConclusion(organizationId, teamId, meetingType);

    // Create meeting snapshot for history
    try {
      logger.info('Creating meeting snapshot for history...');
      
      // Get the meeting that was just concluded
      let meetingToSnapshot;
      if (specificMeetingId) {
        const result = await db.query(
          'SELECT * FROM meetings WHERE id = $1 AND organization_id = $2',
          [specificMeetingId, organizationId]
        );
        meetingToSnapshot = result.rows[0];
      } else if (meetingUpdateResult && meetingUpdateResult.rows.length > 0) {
        meetingToSnapshot = meetingUpdateResult.rows[0];
      }

      // Create snapshot whether we have a formal meeting record or not
      // This handles cases where meetings are concluded without being formally started
      if (meetingToSnapshot || (organizationId && teamId)) {
        // Calculate duration
        const durationMinutes = meetingToSnapshot?.actual_end_time && meetingToSnapshot?.actual_start_time
          ? Math.round((new Date(meetingToSnapshot.actual_end_time) - new Date(meetingToSnapshot.actual_start_time)) / 60000)
          : duration || null;

        // Build snapshot data from meeting conclusion data
        const snapshotData = {
          issues: issues || [],
          todos: todos || [],
          attendees: individualRatings || attendees || [],
          notes: notes || meetingToSnapshot?.notes || '',
          rating: rating || meetingToSnapshot?.rating,
          metrics: metrics || [],
          summary: summary || '',
          cascadingMessage: cascadingMessage || '',
          aiSummary: aiSummary || null
        };

        // Create snapshot
        await db.query(
          `INSERT INTO meeting_snapshots 
           (meeting_id, organization_id, team_id, meeting_type, meeting_date, 
            duration_minutes, average_rating, facilitator_id, snapshot_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (meeting_id) DO NOTHING`,
          [
            meetingToSnapshot?.id || null,  // Can be null for informal meetings
            organizationId,
            teamId,
            meetingType || 'Weekly Accountability',
            meetingToSnapshot?.scheduled_date || new Date(),
            durationMinutes,
            rating,
            meetingToSnapshot?.facilitator_id || userId,
            JSON.stringify(snapshotData)
          ]
        );
        logger.info('✅ Meeting snapshot created successfully');
      }
    } catch (snapshotError) {
      logger.error('Error creating meeting snapshot:', snapshotError);
      // Don't fail the entire conclusion if snapshot creation fails
    }

    res.json({
      success: true,
      message: 'Meeting concluded successfully',
      emailsSent: emailsSent
    });

  } catch (error) {
    console.error('Error concluding meeting:', error);
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
    console.error('Error fetching AI summary:', error);
    return null;
  }
}