import db from '../config/database.js';
import { sendEmail } from './emailService.js';
import { isZeroUUID } from '../utils/teamUtils.js';

/**
 * Send todo reminders for items due in 2 days
 */
export const sendTodoReminders = async () => {
  console.log('Starting 2-day to-do due date reminder process...');
  
  try {
    // 1. Calculate the target due date (2 days from now)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // 2. Query for all to-dos due on the target date (handles both single and multi-assignee)
    const todosDueSoon = await db.query(`
      SELECT DISTINCT
        t.title, 
        t.due_date, 
        COALESCE(u2.email, u.email) as email,
        COALESCE(u2.first_name, u.first_name) as first_name
      FROM todos t
      LEFT JOIN users u ON t.assigned_to_id = u.id
      LEFT JOIN todo_assignees ta ON t.id = ta.todo_id
      LEFT JOIN users u2 ON ta.user_id = u2.id
      WHERE t.due_date = $1
        AND t.status != 'complete'
        AND t.deleted_at IS NULL
        AND COALESCE(u2.email, u.email) IS NOT NULL
    `, [targetDate]);

    if (todosDueSoon.rows.length === 0) {
      console.log('No to-dos are due in 2 days. No reminders sent.');
      return { sent: 0, users: [] };
    }

    // 3. Group to-dos by user email
    const todosByUser = todosDueSoon.rows.reduce((acc, todo) => {
      if (!acc[todo.email]) {
        acc[todo.email] = {
          firstName: todo.first_name,
          todos: []
        };
      }
      acc[todo.email].todos.push(todo);
      return acc;
    }, {});

    // 4. Iterate over users and send one email to each
    const remindersSent = [];
    for (const email in todosByUser) {
      const userData = todosByUser[email];
      const emailData = {
        firstName: userData.firstName,
        todos: userData.todos
      };
      
      try {
        await sendEmail(email, 'todoDueDateReminder', emailData);
        remindersSent.push({ email, todoCount: userData.todos.length });
        console.log(`Sent 2-day due date reminder to ${email} for ${userData.todos.length} to-do(s)`);
      } catch (error) {
        console.error(`Failed to send reminder to ${email}:`, error);
      }
    }

    console.log('2-day to-do due date reminders sent successfully:', remindersSent);
    return { sent: remindersSent.length, users: remindersSent };

  } catch (error) {
    console.error('Failed to send 2-day to-do due date reminders:', error);
    throw error;
  }
};

/**
 * Check if AI transcription was used for a meeting
 */
export const checkIfAIWasUsed = async (meetingId, organizationId) => {
  try {
    if (!meetingId) return null;
    
    // Check if there's a transcript for this meeting
    const result = await db.query(`
      SELECT id, processing_started_at 
      FROM meeting_transcripts 
      WHERE meeting_id = $1 AND organization_id = $2 AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, [meetingId, organizationId]);
    
    if (result.rows.length > 0) {
      return {
        used: true,
        started_at: result.rows[0].processing_started_at
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error checking if AI was used:', error);
    return null;
  }
};

/**
 * Record when a meeting was concluded with AI tracking and meeting metadata
 * This should be called from the concludeMeeting endpoint
 */
export const recordMeetingConclusion = async (organizationId, teamId, meetingType = 'weekly', options = {}) => {
  try {
    const { 
      meetingId = null, 
      participantCount = null, 
      durationMinutes = null,
      attendees = []
    } = options;
    
    // Check if AI was used for this meeting
    const aiSession = await checkIfAIWasUsed(meetingId, organizationId);
    
    // Calculate participant count from attendees if not provided
    const finalParticipantCount = participantCount || (attendees?.length > 0 ? attendees.length : null);
    
    await db.query(
      `INSERT INTO meeting_conclusions (
        organization_id, 
        team_id, 
        meeting_type, 
        concluded_at,
        used_ai_notes,
        ai_notes_started_at,
        participant_count,
        meeting_duration_minutes
      )
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)`,
      [
        organizationId, 
        teamId, 
        meetingType,
        aiSession ? true : false,
        aiSession?.started_at || null,
        finalParticipantCount,
        durationMinutes
      ]
    );
    
    console.log(`Recorded meeting conclusion for team ${teamId}`, {
      usedAI: aiSession ? true : false,
      participantCount: finalParticipantCount,
      duration: durationMinutes
    });
  } catch (error) {
    console.error('Failed to record meeting conclusion:', error);
    // Don't throw - this is not critical to the meeting flow
  }
};

export default {
  sendTodoReminders,
  recordMeetingConclusion,
  checkIfAIWasUsed
};