import cron from 'node-cron';
import { processTrialEndings, sendTrialReminders } from '../controllers/subscriptionController.js';

// Initialize subscription-related cron jobs
const initializeSubscriptionJobs = () => {
  // Process trial endings every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running trial ending processor...');
    try {
      await processTrialEndings();
      console.log('Trial ending processor completed');
    } catch (error) {
      console.error('Trial ending processor failed:', error);
    }
  });

  // Send trial reminders every day at 10 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running trial reminder sender...');
    try {
      await sendTrialReminders();
      console.log('Trial reminder sender completed');
    } catch (error) {
      console.error('Trial reminder sender failed:', error);
    }
  });

  console.log('Subscription cron jobs initialized');
};

export { initializeSubscriptionJobs };