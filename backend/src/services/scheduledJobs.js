import cron from 'node-cron';
import { processDailyActiveUsersReport } from './dailyActiveUsersService.js';
import { sendTodoReminders } from './todoReminderService.js';
import { archiveExpiredCascadingMessages } from './cascadingMessageExpirationService.js';
import { initErrorAlertCron } from './errorAlertService.js';

/**
 * Initialize all scheduled jobs
 */
export const initializeScheduledJobs = () => {
  console.log('Initializing scheduled jobs...');
  
  // Schedule daily active users report
  // Runs every day at 8:00 AM server time
  cron.schedule('0 8 * * *', async () => {
    console.log('Running scheduled daily active users report...');
    try {
      const result = await processDailyActiveUsersReport();
      console.log('Daily active users report completed:', result);
    } catch (error) {
      console.error('Failed to process daily active users report:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York' // Default to EST
  });
  
  // Schedule todo reminders
  // Runs every day at 9:00 AM, but skips Nov 5, 2025 (manual trigger ran on Nov 4)
  cron.schedule('0 9 * * *', async () => {
    const today = new Date();
    const skipDate = new Date('2025-11-05');
    
    // Skip if today is Nov 5, 2025
    if (today.toDateString() === skipDate.toDateString()) {
      console.log('Skipping todo reminders for Nov 5, 2025 (manual trigger was run yesterday)');
      return;
    }
    
    console.log('Running scheduled todo reminders check...');
    try {
      const result = await sendTodoReminders();
      console.log('Todo reminders completed:', result);
    } catch (error) {
      console.error('Failed to send todo reminders:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York' // Default to EST
  });
  
  // Schedule cascading message expiration
  // Runs every day at 2:00 AM server time to archive messages older than 7 days
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled cascading message expiration...');
    try {
      const result = await archiveExpiredCascadingMessages();
      console.log('Cascading message expiration completed:', result);
    } catch (error) {
      console.error('Failed to archive expired cascading messages:', error);
    }
  }, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York' // Default to EST
  });
  
  // Initialize error alert monitoring (every 5 minutes)
  try {
    initErrorAlertCron();
  } catch (error) {
    console.error('Failed to initialize error alert cron:', error);
  }
  
  console.log('Scheduled jobs initialized:');
  console.log('- Error alert monitoring: every 5 minutes');
  console.log('- Cascading message expiration: 2:00 AM daily (7-day auto-archive)');
  console.log('- Daily active users report: 8:00 AM daily');
  console.log('- Todo reminders: 9:00 AM daily (skipping Nov 5, 2025 due to manual trigger)');
  
  // Optional: Schedule a test run in development
  if (process.env.NODE_ENV === 'development') {
    // Run once after 10 seconds for testing
    setTimeout(async () => {
      console.log('Running test daily active users report (development mode)...');
      try {
        const result = await processDailyActiveUsersReport();
        console.log('Test report completed:', result);
      } catch (error) {
        console.error('Test report failed:', error);
      }
    }, 10000);
  }
};

/**
 * Manually trigger daily active users report
 * Useful for testing or on-demand generation
 */
export const triggerDailyActiveUsersReport = async () => {
  console.log('Manually triggering daily active users report...');
  try {
    const result = await processDailyActiveUsersReport();
    console.log('Manual report completed:', result);
    return result;
  } catch (error) {
    console.error('Manual report failed:', error);
    throw error;
  }
};

export default {
  initializeScheduledJobs,
  triggerDailyActiveUsersReport
};