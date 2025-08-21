import dotenv from 'dotenv';
import { query } from './src/config/database.js';
import { 
  generateDailyActiveUsersReport, 
  sendDailyActiveUsersEmail 
} from './src/services/dailyActiveUsersService.js';

// Load environment variables
dotenv.config();

async function testDailyReport() {
  try {
    console.log('Testing Daily Active Users Report System...\n');
    
    // Step 1: Check if tracking table exists
    console.log('1. Checking if user_login_tracking table exists...');
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_login_tracking'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ❌ Table does not exist. Please run the migration first.');
      console.log('   Run: psql $DATABASE_URL < backend/database/migrations/010_user_login_tracking.sql');
      return;
    }
    console.log('   ✅ Table exists\n');
    
    // Step 2: Check for recent login data
    console.log('2. Checking for recent login data...');
    const recentLogins = await query(`
      SELECT COUNT(*) as count, MAX(login_date) as last_date
      FROM user_login_tracking
      WHERE login_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    console.log(`   Found ${recentLogins.rows[0].count} logins in the last 7 days`);
    if (recentLogins.rows[0].last_date) {
      console.log(`   Last login date: ${recentLogins.rows[0].last_date}\n`);
    } else {
      console.log('   No login data found. Users need to log in to generate data.\n');
    }
    
    // Step 3: Generate a report for today (or yesterday if no data today)
    console.log('3. Generating report...');
    const report = await generateDailyActiveUsersReport();
    
    console.log('   Report generated successfully!');
    console.log(`   - Report Date: ${report.reportDate}`);
    console.log(`   - Active Organizations: ${report.summary.active_organizations}`);
    console.log(`   - Total Unique Users: ${report.summary.total_unique_users}`);
    console.log(`   - Total Logins: ${report.summary.total_logins}\n`);
    
    // Step 4: Check for configured recipients
    console.log('4. Checking for email recipients...');
    const recipients = await query(`
      SELECT email, first_name, last_name, role
      FROM users
      WHERE receive_daily_login_reports = TRUE
    `);
    
    if (recipients.rows.length === 0) {
      console.log('   No recipients configured.');
      console.log('   To enable daily reports for yourself, run:');
      console.log('   UPDATE users SET receive_daily_login_reports = TRUE WHERE email = \'your-email@example.com\';\n');
    } else {
      console.log(`   Found ${recipients.rows.length} recipient(s):`);
      recipients.rows.forEach(r => {
        console.log(`   - ${r.first_name} ${r.last_name} (${r.email}) - Role: ${r.role}`);
      });
      console.log('');
    }
    
    // Step 5: Send a test email (optional)
    const shouldSendTest = process.argv.includes('--send');
    if (shouldSendTest && recipients.rows.length > 0) {
      console.log('5. Sending test email to first recipient...');
      const testRecipient = recipients.rows[0];
      
      try {
        await sendDailyActiveUsersEmail(testRecipient.email, report);
        console.log(`   ✅ Test email sent to ${testRecipient.email}\n`);
      } catch (error) {
        console.log(`   ❌ Failed to send email: ${error.message}`);
        console.log('   Make sure SENDGRID_API_KEY is configured in .env\n');
      }
    } else if (shouldSendTest) {
      console.log('5. No recipients to send test email to.\n');
    } else {
      console.log('5. To send a test email, run: npm run test-daily-report -- --send\n');
    }
    
    console.log('Test complete! 🎉');
    console.log('\nTo enable daily reports:');
    console.log('1. Update a user to receive reports:');
    console.log('   UPDATE users SET receive_daily_login_reports = TRUE WHERE role IN (\'admin\', \'owner\');');
    console.log('2. The report will run automatically at 8:00 AM daily');
    console.log('3. Or trigger manually via API: POST /api/v1/daily-active-users/send');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDailyReport();