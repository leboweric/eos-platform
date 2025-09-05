import db from '../config/database.js';
import emailService from '../services/emailService.js';
import { recordMeetingConclusion } from '../services/todoReminderService.js';
import { isZeroUUID, isLeadershipTeam } from '../utils/teamUtils.js';

// Conclude a meeting and send summary email
export const concludeMeeting = async (req, res) => {
  try {
    console.log('Request params:', req.params);
    console.log('Request URL:', req.url);
    console.log('Request baseUrl:', req.baseUrl);
    
    const { 
      meetingType,
      duration,
      rating,
      summary,
      attendees,
      metrics,
      todos,
      issues,
      notes,
      cascadingMessage
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

    console.log('Concluding meeting with VALIDATED teamId:', { meetingType, duration, rating, organizationId, teamId });

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
    console.log('Getting team members for teamId:', teamId);
    
    let attendeeEmails = [];
    let teamMembersCount = 0;
    
    // Query team members (we know teamId is valid and not zero UUID at this point)
    const teamCheckResult = await db.query(
      `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
      [teamId]
    );
    console.log('Team members count:', teamCheckResult.rows[0].count);
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
      console.log('Team member emails:', attendeeEmails);
    }
    } else {
      // If teamId is not a valid UUID, fall back to organization-wide emails
      console.log('Invalid teamId UUID, using organization-wide emails as fallback');
      const orgUsersResult = await db.query(
        `SELECT DISTINCT u.email, u.first_name, u.last_name 
         FROM users u
         WHERE u.organization_id = $1 
         AND u.email IS NOT NULL
         AND u.email != ''`,
        [organizationId]
      );
      attendeeEmails = orgUsersResult.rows.map(row => row.email);
      console.log('Organization users:', orgUsersResult.rows);
    }

    console.log('Sending meeting summary to:', attendeeEmails);

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
      // Get current active priorities - no quarter filtering, just like the Rock Review page
      const rocksQuery = `SELECT id, title, status, progress 
         FROM quarterly_priorities 
         WHERE organization_id = $1 
         AND deleted_at IS NULL`;
      
      const rocksResult = await db.query(
        rocksQuery,
        [organizationId]
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
      const todoQuery = teamId && !isZeroUUID(teamId) && isValidUUID
        ? `SELECT t.*, u.first_name, u.last_name 
           FROM todos t
           LEFT JOIN users u ON t.assigned_to_id = u.id
           WHERE t.team_id = $1 
           AND t.status = 'incomplete' 
           AND t.deleted_at IS NULL
           ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`
        : `SELECT t.*, u.first_name, u.last_name 
           FROM todos t
           LEFT JOIN users u ON t.assigned_to_id = u.id
           WHERE t.organization_id = $1 
           AND t.team_id IS NULL
           AND t.status = 'incomplete' 
           AND t.deleted_at IS NULL
           ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;
      
      const todoResult = await db.query(
        todoQuery,
        [teamId && !isZeroUUID(teamId) && isValidUUID ? teamId : organizationId]
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

    // Format issues
    const formattedIssues = (issues || []).map(issue => 
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
      rating: rating || 'Not rated',
      organizationName,
      concludedBy: userName,
      summary: summary || '',
      metrics: metrics || {},
      rockCompletionPercentage,
      completedRocks,
      totalRocks,
      openTodos: openTodos, // Primary focus: all open todos
      completedItems: formattedCompletedItems,
      newTodos: formattedNewTodos,
      issues: formattedIssues,
      cascadingMessages: cascadingMessages, // Add cascading messages
      notes: notes || ''
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
    
    // Send email to attendees (with safety limit applied)
    if (attendeeEmails.length > 0) {
      try {
        console.log('Attempting to send email to', attendeeEmails.length, 'recipients');
        console.log('Recipients:', attendeeEmails);
        
        // Send to each email address
        for (const email of attendeeEmails) {
          await emailService.sendEmail(email, 'meetingSummary', emailData);
        }
        
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

    // Record meeting conclusion for reminder scheduling
    await recordMeetingConclusion(organizationId, teamId, meetingType);

    res.json({
      success: true,
      message: 'Meeting concluded successfully',
      emailsSent: attendeeEmails.length
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