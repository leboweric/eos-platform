# Implementation Guide: 2-Day To-Do Due Date Reminders

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This guide provides the detailed implementation steps for creating the 2-day to-do due date reminder feature. We will modify the existing `todoReminderService` and `emailService` to leverage our current infrastructure.

## 2. Implementation Steps

Please have Claude Code follow these steps precisely.

### Step 1: Add New Email Template

First, we need to create the email template for the due date reminder.

**File:** `backend/src/services/emailService.js`

**Action:** Add the following `todoDueDateReminder` template to the `templates` object (around line 743).

```javascript
  todoDueDateReminder: (data) => ({
    subject: `You have ${data.todos.length} to-do(s) due in 2 days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>To-Do Reminder</h2>
        <p>Hi ${data.firstName},</p>
        <p>This is a reminder that the following to-do(s) are due in 2 days:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <ul style="color: #333; line-height: 1.8; list-style-type: none; padding: 0;">
            ${data.todos.map(todo => `
              <li style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                <strong>${todo.title}</strong><br/>
                <span style="color: #6b7280; font-size: 14px;">Due: ${new Date(todo.due_date).toLocaleDateString()}</span>
              </li>
            `).join("")}
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/todos" style="background-color: ${data.themeColor || '#4F46E5'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View All To-Dos
          </a>
        </div>
      </div>
    `,
    text: `
      To-Do Reminder
      
      Hi ${data.firstName},
      
      This is a reminder that the following to-do(s) are due in 2 days:
      
      ${data.todos.map(todo => `- ${todo.title} (Due: ${new Date(todo.due_date).toLocaleDateString()})`).join("\n")}
      
      View all to-dos: ${process.env.FRONTEND_URL || 'https://axplatform.app'}/todos
    `
  }),

  // ... existing templates
```

### Step 2: Update the Reminder Service Logic

Next, replace the logic in the `todoReminderService` to query by due date.

**File:** `backend/src/services/todoReminderService.js`

**Action:** Replace the entire `sendTodoReminders` function (lines 8-172) with the following new implementation:

```javascript
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
        u.first_name,
        o.theme_color, 
        o.primary_color
      FROM todos t
      JOIN users u ON t.assigned_to_id = u.id
      JOIN organizations o ON u.organization_id = o.id
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
          themeColor: todo.theme_color || todo.primary_color || '#4F46E5',
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
        themeColor: userData.themeColor,
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
```

### Step 3: Update Scheduled Job Log Message

Finally, let's update the log message in the scheduler for clarity.

**File:** `backend/src/services/scheduledJobs.js`

**Action:** Find line 43 and change the log message.

*   **Find:**
    ```javascript
    console.log('- Todo reminders: 9:00 AM daily (sends to teams 6 days after meeting)');
    ```
*   **Replace with:**
    ```javascript
    console.log('- Todo reminders: 9:00 AM daily (sends 2-day due date reminders)');
    ```

## 3. Conclusion

After completing these three steps, the system will automatically send email reminders to users for any to-dos that are due in exactly two days. The existing cron job will trigger this new logic daily at 9:00 AM.

