import cron from 'node-cron';
import { processDailyActiveUsersReport } from './dailyActiveUsersService.js';
import { sendTodoReminders } from './todoReminderService.js';

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
  // Runs every day at 9:00 AM to check for teams that need reminders
  cron.schedule('0 9 * * *', async () => {
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
  
  console.log('Scheduled jobs initialized:');
  console.log('- Daily active users report: 8:00 AM daily');
  console.log('- Todo reminders: 9:00 AM daily (sends to teams 6 days after meeting)');
  
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