#!/usr/bin/env node

/**
 * Manual script to test the todo reminder cron job
 * Usage: node backend/scripts/test-todo-reminders.js
 */

import { sendTodoReminders } from '../src/services/todoReminderService.js';

console.log('🔄 Manually triggering todo reminder job...\n');

try {
  const result = await sendTodoReminders();
  
  console.log('\n✅ Todo reminder job completed successfully!');
  console.log(`📊 Results: ${result.sent} reminder(s) sent`);
  
  if (result.users && result.users.length > 0) {
    console.log('\n📧 Reminders sent to:');
    result.users.forEach(user => {
      console.log(`  - ${user.email} (${user.todoCount} todo(s))`);
    });
  } else {
    console.log('\n📭 No todos are due in 2 days. No reminders sent.');
  }
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error running todo reminder job:', error);
  process.exit(1);
}

