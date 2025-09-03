import db from '../config/database.js';
import emailService from '../services/emailService.js';
import { recordMeetingConclusion } from '../services/todoReminderService.js';

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
    const organizationId = req.user.organization_id || req.user.organizationId;
    let teamId = req.params.teamId;
    
    // Handle "null" string or invalid team IDs - treat as leadership team
    if (teamId === 'null' || teamId === 'undefined' || !teamId) {
      console.log('Invalid team ID detected:', teamId, '- defaulting to leadership team');
      teamId = '00000000-0000-0000-0000-000000000000'; // Leadership team placeholder
    }

    console.log('Concluding meeting:', { meetingType, duration, rating, organizationId, teamId });

    // Get organization details
    const orgResult = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [organizationId]
    );
    const organizationName = orgResult.rows[0]?.name || 'Your Organization';

    // Validate teamId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = teamId && uuidRegex.test(teamId);
    
    // Get team/department name
    let teamName = 'Leadership Team'; // default for leadership team
    if (isValidUUID && teamId !== '00000000-0000-0000-0000-000000000000') {
      const teamResult = await db.query(
        'SELECT name FROM teams WHERE id = $1',
        [teamId]
      );
      teamName = teamResult.rows[0]?.name || 'Team';
    } else if (!isValidUUID && teamId) {
      console.log('Warning: Invalid UUID format for teamId:', teamId);
      teamName = 'Team'; // Fallback for invalid UUID
    }

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
    
    // Only query team members if we have a valid UUID
    if (isValidUUID) {
      // Check if this is the leadership team
      if (teamId === '00000000-0000-0000-0000-000000000000') {
        // For leadership team, check team_members table first
        const leadershipCheckResult = await db.query(
          `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
          [teamId]
        );
        const leadershipMembersCount = parseInt(leadershipCheckResult.rows[0].count);
        console.log('Leadership team members count:', leadershipMembersCount);
        
        if (leadershipMembersCount > 0) {
          // Use team_members table
          const leadershipResult = await db.query(
            `SELECT DISTINCT u.email, u.first_name, u.last_name 
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = $1
             AND u.email IS NOT NULL
             AND u.email != ''`,
            [teamId]
          );
          attendeeEmails = leadershipResult.rows.map(row => row.email);
          console.log('Leadership team members from team_members table:', leadershipResult.rows);
        } else {
          // Fallback: For leadership team, get all users in the organization
          console.log('No leadership team members in team_members table, using all org users');
          const leadershipResult = await db.query(
            `SELECT DISTINCT u.email, u.first_name, u.last_name 
             FROM users u
             WHERE u.organization_id = $1 
             AND u.email IS NOT NULL
             AND u.email != ''`,
            [organizationId]
          );
          attendeeEmails = leadershipResult.rows.map(row => row.email);
          console.log('All organization users:', leadershipResult.rows);
        }
        console.log('Leadership team emails:', attendeeEmails);
      } else {
        // For other teams, first check if team_members table has entries
        const teamCheckResult = await db.query(
          `SELECT COUNT(*) as count FROM team_members WHERE team_id = $1`,
          [teamId]
        );
        console.log('Team members count:', teamCheckResult.rows[0].count);
        teamMembersCount = parseInt(teamCheckResult.rows[0].count);
        
        // If no team_members entries, we can't determine team membership
        if (teamMembersCount === 0) {
          console.log('No team members found in team_members table for team:', teamId);
          // For now, we'll send to no one if team_members is empty
          // You could alternatively send to all org members or implement a different strategy
          attendeeEmails = [];
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
          console.log('Team members query result:', teamMembersResult.rows);
        }
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
    if (teamId === '00000000-0000-0000-0000-000000000000') {
      // For leadership team, use same logic as emails
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
      const todoQuery = teamId && teamId !== '00000000-0000-0000-0000-000000000000'
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
           AND (t.team_id IS NULL OR t.team_id = '00000000-0000-0000-0000-000000000000')
           AND t.status = 'incomplete' 
           AND t.deleted_at IS NULL
           ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;
      
      const todoResult = await db.query(
        todoQuery,
        [teamId && teamId !== '00000000-0000-0000-0000-000000000000' ? teamId : organizationId]
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

    // Send email to all attendees
    if (attendeeEmails.length > 0) {
      try {
        console.log('Attempting to send email with data:', {
          to: attendeeEmails,
          subject: `${meetingType || 'Meeting'} Summary - ${organizationName}`,
          template: 'meetingSummary'
        });
        
        // Send to each email address
        for (const email of attendeeEmails) {
          await emailService.sendEmail(email, 'meetingSummary', emailData);
        }
        
        console.log('Meeting summary emails sent successfully to:', attendeeEmails);
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