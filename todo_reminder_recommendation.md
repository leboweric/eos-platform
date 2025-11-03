# Architectural Recommendation: 2-Day To-Do Due Date Reminders

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Executive Summary

The customer has requested that all users receive an email reminder two days before a to-do is due. Our existing infrastructure is well-suited to handle this with minimal changes. We already have:

-   An `emailService` for sending emails.
-   A `scheduledJobs` service using `node-cron` to run daily tasks.
-   A `todoReminderService` that sends reminders (though not based on due dates).
-   A `todos` table with a `due_date` column.

This document outlines the architectural changes needed to implement the 2-day due date reminder feature by modifying the existing `todoReminderService`.

## 2. Current Implementation Analysis

I have reviewed the existing codebase and found the following:

-   **`scheduledJobs.js`**: A cron job is already scheduled to run `sendTodoReminders()` daily at 9:00 AM.
-   **`todoReminderService.js`**: The current `sendTodoReminders` function sends reminders to teams **6 days after their last meeting**, not based on to-do due dates. It fetches all open to-dos for those teams and sends an email.
-   **`todos` table**: The `todos` table has a `due_date` column of type `DATE`, which is exactly what we need.

## 3. Architectural Recommendation

I recommend modifying the existing `todoReminderService.js` to implement the new functionality. This approach is low-risk and leverages our existing infrastructure.

### Key Changes

1.  **Modify `sendTodoReminders` function:**
    -   Instead of fetching teams based on their last meeting date, we will query the `todos` table directly.
    -   The query will select all to-dos with a `due_date` that is exactly **two days from now**.
    -   We will group these to-dos by their `assigned_to_id` to send one email per user with all their upcoming to-dos.

2.  **Update the Email Template:**
    -   The email template will need to be updated to reflect that it is a due date reminder, not a post-meeting summary.

### New `sendTodoReminders` Logic

Here is the proposed logic for the updated `sendTodoReminders` function:

```javascript
// 1. Calculate the target due date (2 days from now)
const twoDaysFromNow = new Date();
twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

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
`, [twoDaysFromNow]);

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
for (const email in todosByUser) {
  const userData = todosByUser[email];
  const emailData = {
    firstName: userData.firstName,
    todos: userData.todos,
    // ... any other data for the email template
  };
  
  await sendEmail(email, 'todoDueDateReminder', emailData);
}
```

## 4. Implementation Steps for Claude Code

Here are the step-by-step instructions for Claude Code to implement this feature:

1.  **Modify `todoReminderService.js`:**
    -   Open `backend/src/services/todoReminderService.js`.
    -   Replace the existing `sendTodoReminders` function with the new logic outlined above.
    -   Ensure the `sendEmail` call uses a new template name, e.g., `todoDueDateReminder`.

2.  **Create a New Email Template:**
    -   The `emailService` will need a new template for `todoDueDateReminder`.
    -   This template should be a simple, clean email that lists the to-dos due in two days.

3.  **Update `scheduledJobs.js` (Optional but Recommended):**
    -   In `backend/src/services/scheduledJobs.js`, update the log message for the todo reminders job to reflect the new functionality:
        ```javascript
        // From:
        console.log("- Todo reminders: 9:00 AM daily (sends to teams 6 days after meeting)");

        // To:
        console.log("- Todo reminders: 9:00 AM daily (sends 2-day due date reminders)");
        ```

## 5. Conclusion

This approach is efficient, low-risk, and reuses our existing infrastructure. It directly addresses the customer's request and provides a solid foundation for any future reminder-based features.

