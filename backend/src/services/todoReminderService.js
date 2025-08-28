import db from '../config/database.js';
import { sendEmail } from './emailService.js';

/**
 * Send todo reminders to teams that had meetings 6 days ago
 */
export const sendTodoReminders = async () => {
  console.log('Starting todo reminder process...');
  
  try {
    // Get all teams that need reminders (meetings concluded 6 days ago)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    sixDaysAgo.setHours(0, 0, 0, 0);
    
    const sixDaysAgoEnd = new Date(sixDaysAgo);
    sixDaysAgoEnd.setHours(23, 59, 59, 999);
    
    // Get teams with their last meeting dates from meeting_conclusions table
    const teamsQuery = `
      SELECT DISTINCT 
        mc.team_id,
        mc.organization_id,
        t.name as team_name,
        o.name as organization_name,
        mc.concluded_at,
        t.is_leadership_team
      FROM meeting_conclusions mc
      JOIN organizations o ON mc.organization_id = o.id
      LEFT JOIN teams t ON mc.team_id = t.id
      WHERE mc.concluded_at >= $1 
        AND mc.concluded_at <= $2
        AND mc.meeting_type = 'weekly'
    `;
    
    const teamsResult = await db.query(teamsQuery, [sixDaysAgo, sixDaysAgoEnd]);
    
    if (teamsResult.rows.length === 0) {
      console.log('No teams need reminders today');
      return { sent: 0, teams: [] };
    }
    
    console.log(`Found ${teamsResult.rows.length} teams needing reminders`);
    
    const remindersSent = [];
    
    for (const team of teamsResult.rows) {
      try {
        const { team_id, organization_id, team_name, organization_name, is_leadership_team } = team;
        const effectiveTeamName = is_leadership_team || !team_name ? 'Leadership Team' : team_name;
        
        // Fetch open todos for the team
        const todoQuery = team_id && team_id !== '00000000-0000-0000-0000-000000000000'
          ? `SELECT t.*, u.first_name, u.last_name 
             FROM todos t
             LEFT JOIN users u ON t.assigned_to = u.id::text
             WHERE t.team_id = $1 
             AND t.status != 'complete' 
             AND t.deleted_at IS NULL
             ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`
          : `SELECT t.*, u.first_name, u.last_name 
             FROM todos t
             LEFT JOIN users u ON t.assigned_to = u.id::text
             WHERE t.organization_id = $1 
             AND (t.team_id IS NULL OR t.team_id = '00000000-0000-0000-0000-000000000000')
             AND t.status != 'complete' 
             AND t.deleted_at IS NULL
             ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;
        
        const todoResult = await db.query(
          todoQuery,
          [team_id && team_id !== '00000000-0000-0000-0000-000000000000' ? team_id : organization_id]
        );
        
        const openTodos = todoResult.rows.map(todo => ({
          title: todo.todo || 'Untitled',
          assignee: todo.first_name && todo.last_name 
            ? `${todo.first_name} ${todo.last_name}`
            : todo.assigned_to_name || 'Unassigned',
          dueDate: todo.due_date ? new Date(todo.due_date).toLocaleDateString() : 'No due date'
        }));
        
        // Get team member emails
        let teamMemberEmails = [];
        
        if (team_id === '00000000-0000-0000-0000-000000000000' || !team_id) {
          // Leadership team - get all org users
          const emailsResult = await db.query(
            `SELECT DISTINCT email FROM users 
             WHERE organization_id = $1 
             AND email IS NOT NULL 
             AND email != ''`,
            [organization_id]
          );
          teamMemberEmails = emailsResult.rows.map(r => r.email);
        } else {
          // Department team - get team members
          const emailsResult = await db.query(
            `SELECT DISTINCT u.email 
             FROM team_members tm
             JOIN users u ON tm.user_id = u.id
             WHERE tm.team_id = $1
             AND u.email IS NOT NULL
             AND u.email != ''`,
            [team_id]
          );
          
          if (emailsResult.rows.length > 0) {
            teamMemberEmails = emailsResult.rows.map(r => r.email);
          } else {
            // Fallback to department members
            const deptEmailsResult = await db.query(
              `SELECT DISTINCT email FROM users 
               WHERE team_id = $1 
               AND email IS NOT NULL 
               AND email != ''`,
              [team_id]
            );
            teamMemberEmails = deptEmailsResult.rows.map(r => r.email);
          }
        }
        
        if (teamMemberEmails.length === 0) {
          console.log(`No email addresses found for team: ${effectiveTeamName}`);
          continue;
        }
        
        // Prepare email data
        const emailData = {
          teamName: effectiveTeamName,
          organizationName: organization_name,
          openTodos: openTodos,
          meetingLink: `${process.env.FRONTEND_URL || 'https://axplatform.app'}/todos`
        };
        
        // Send email to each team member
        for (const email of teamMemberEmails) {
          try {
            await sendEmail(email, 'todoReminder', emailData);
            console.log(`Sent reminder to ${email} for ${effectiveTeamName}`);
          } catch (error) {
            console.error(`Failed to send reminder to ${email}:`, error);
          }
        }
        
        remindersSent.push({
          team: effectiveTeamName,
          organization: organization_name,
          emailsSent: teamMemberEmails.length,
          openTodos: openTodos.length
        });
        
      } catch (teamError) {
        console.error(`Failed to process team ${team.team_name}:`, teamError);
      }
    }
    
    console.log('Todo reminders sent successfully:', remindersSent);
    return { sent: remindersSent.length, teams: remindersSent };
    
  } catch (error) {
    console.error('Failed to send todo reminders:', error);
    throw error;
  }
};

/**
 * Record when a meeting was concluded
 * This should be called from the concludeMeeting endpoint
 */
export const recordMeetingConclusion = async (organizationId, teamId, meetingType = 'weekly') => {
  try {
    await db.query(
      `INSERT INTO meeting_conclusions (organization_id, team_id, meeting_type, concluded_at)
       VALUES ($1, $2, $3, NOW())`,
      [organizationId, teamId, meetingType]
    );
    console.log(`Recorded meeting conclusion for team ${teamId}`);
  } catch (error) {
    console.error('Failed to record meeting conclusion:', error);
    // Don't throw - this is not critical to the meeting flow
  }
};

export default {
  sendTodoReminders,
  recordMeetingConclusion
};