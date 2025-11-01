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

    // 2. Query for all to-dos due on the target date
    const todosDueSoon = await db.query(`
      SELECT 
        t.title, 
        t.due_date, 
        u.email, 
        u.first_name
      FROM todos t
      JOIN users u ON t.assigned_to_id = u.id
      WHERE t.due_date = $1
        AND t.status != 'complete'
        AND t.deleted_at IS NULL
        AND u.email IS NOT NULL
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