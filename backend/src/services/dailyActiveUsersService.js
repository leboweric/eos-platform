import { query } from '../config/database.js';
import { sendEmail } from './emailService.js';

/**
 * Generate daily active users report for the previous day
 * @param {Date} reportDate - The date to generate the report for (defaults to yesterday)
 * @returns {Object} Report data
 */
export const generateDailyActiveUsersReport = async (reportDate = null) => {
  try {
    // Default to yesterday if no date provided
    const targetDate = reportDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dateString = targetDate.toISOString().split('T')[0];
    
    console.log(`Generating daily active users report for ${dateString}`);
    
    // Get login data for the specified date
    const loginDataResult = await query(
      `SELECT 
        o.id as organization_id,
        o.name as organization_name,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        COUNT(ult.id) as login_count,
        MIN(ult.login_timestamp::TIME) as first_login_time,
        MAX(ult.login_timestamp::TIME) as last_login_time,
        SUM(COALESCE(ult.session_duration_minutes, 0))::INTEGER as total_session_minutes,
        ARRAY_AGG(DISTINCT ult.auth_method) as auth_methods
      FROM user_login_tracking ult
      JOIN users u ON ult.user_id = u.id
      JOIN organizations o ON ult.organization_id = o.id
      WHERE ult.login_date = $1
      GROUP BY o.id, o.name, u.email, u.first_name, u.last_name
      ORDER BY o.name, u.email`,
      [dateString]
    );
    
    // Get summary statistics
    const summaryResult = await query(
      `SELECT 
        COUNT(DISTINCT organization_id) as active_organizations,
        COUNT(DISTINCT user_id) as total_unique_users,
        COUNT(*) as total_logins
      FROM user_login_tracking
      WHERE login_date = $1`,
      [dateString]
    );
    
    // Get organization-level summary
    const orgSummaryResult = await query(
      `SELECT 
        o.name as organization_name,
        COUNT(DISTINCT ult.user_id) as unique_users,
        COUNT(ult.id) as total_logins,
        AVG(COALESCE(ult.session_duration_minutes, 0))::INTEGER as avg_session_minutes
      FROM user_login_tracking ult
      JOIN organizations o ON ult.organization_id = o.id
      WHERE ult.login_date = $1
      GROUP BY o.id, o.name
      ORDER BY unique_users DESC, o.name`,
      [dateString]
    );
    
    return {
      reportDate: dateString,
      summary: summaryResult.rows[0] || {
        active_organizations: 0,
        total_unique_users: 0,
        total_logins: 0
      },
      organizationSummary: orgSummaryResult.rows,
      detailedLogins: loginDataResult.rows
    };
  } catch (error) {
    console.error('Error generating daily active users report:', error);
    throw error;
  }
};

/**
 * Send daily active users report via email
 * @param {string} recipientEmail - Email address to send the report to
 * @param {Object} reportData - The report data from generateDailyActiveUsersReport
 */
export const sendDailyActiveUsersEmail = async (recipientEmail, reportData) => {
  try {
    const { reportDate, summary, organizationSummary, detailedLogins } = reportData;
    
    // Format the report date nicely
    const formattedDate = new Date(reportDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create HTML content for the email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #333;">Daily Active Users Report</h2>
        <p style="color: #666;">Report for ${formattedDate}</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Active Organizations:</strong></td>
              <td style="padding: 8px 0;">${summary.active_organizations}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Unique Users:</strong></td>
              <td style="padding: 8px 0;">${summary.total_unique_users}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Total Logins:</strong></td>
              <td style="padding: 8px 0;">${summary.total_logins}</td>
            </tr>
          </table>
        </div>
        
        ${organizationSummary.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Organization Activity</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #ddd;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Organization</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Unique Users</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Total Logins</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Avg Session (min)</th>
                </tr>
              </thead>
              <tbody>
                ${organizationSummary.map(org => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${org.organization_name}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${org.unique_users}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${org.total_logins}</td>
                    <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${org.avg_session_minutes || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${detailedLogins.length > 0 ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">User Login Details</h3>
            <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #ddd; font-size: 14px;">
              <thead>
                <tr style="background: #f9f9f9;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Organization</th>
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">User</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Logins</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">First Login</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Last Login</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Auth Method</th>
                </tr>
              </thead>
              <tbody>
                ${detailedLogins.map(login => `
                  <tr>
                    <td style="padding: 6px; border-bottom: 1px solid #eee;">${login.organization_name}</td>
                    <td style="padding: 6px; border-bottom: 1px solid #eee;">
                      ${login.user_name}<br>
                      <small style="color: #666;">${login.email}</small>
                    </td>
                    <td style="padding: 6px; text-align: center; border-bottom: 1px solid #eee;">${login.login_count}</td>
                    <td style="padding: 6px; text-align: center; border-bottom: 1px solid #eee;">${login.first_login_time || 'N/A'}</td>
                    <td style="padding: 6px; text-align: center; border-bottom: 1px solid #eee;">${login.last_login_time || 'N/A'}</td>
                    <td style="padding: 6px; text-align: center; border-bottom: 1px solid #eee;">${login.auth_methods.join(', ')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color: #666;">No user logins recorded for this date.</p>'}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>This is an automated report from AXP - Adaptive Execution Platform.</p>
          <p>To unsubscribe from these reports, please update your preferences in the platform settings.</p>
        </div>
      </div>
    `;
    
    // Create plain text version
    const textContent = `
Daily Active Users Report for ${formattedDate}

SUMMARY
-------
Active Organizations: ${summary.active_organizations}
Total Unique Users: ${summary.total_unique_users}
Total Logins: ${summary.total_logins}

${organizationSummary.length > 0 ? `
ORGANIZATION ACTIVITY
--------------------
${organizationSummary.map(org => 
  `${org.organization_name}: ${org.unique_users} users, ${org.total_logins} logins`
).join('\n')}
` : ''}

${detailedLogins.length > 0 ? `
USER LOGIN DETAILS
-----------------
${detailedLogins.map(login => 
  `${login.organization_name} - ${login.user_name} (${login.email}): ${login.login_count} logins`
).join('\n')}
` : 'No user logins recorded for this date.'}

---
This is an automated report from AXP - Adaptive Execution Platform.
    `.trim();
    
    // Send the email
    await sendEmail(recipientEmail, 'dailyActiveUsers', {
      subject: `Daily Active Users Report - ${new Date(reportDate).toLocaleDateString()}`,
      htmlContent,
      textContent
    });
    
    console.log(`Daily active users report sent to ${recipientEmail}`);
  } catch (error) {
    console.error('Error sending daily active users email:', error);
    throw error;
  }
};

/**
 * Process and send daily active users report to all recipients
 */
export const processDailyActiveUsersReport = async () => {
  try {
    console.log('Starting daily active users report processing...');
    
    // Generate the report for yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reportData = await generateDailyActiveUsersReport(yesterday);
    
    // Get list of recipients who should receive the report
    const recipientsResult = await query(
      `SELECT email, first_name 
       FROM users 
       WHERE receive_daily_login_reports = TRUE 
         AND role IN ('admin', 'owner')
         AND email IS NOT NULL`
    );
    
    if (recipientsResult.rows.length === 0) {
      console.log('No recipients configured for daily active users report');
      return;
    }
    
    // Send report to each recipient
    const sendPromises = recipientsResult.rows.map(recipient => 
      sendDailyActiveUsersEmail(recipient.email, reportData)
        .catch(err => console.error(`Failed to send report to ${recipient.email}:`, err))
    );
    
    await Promise.all(sendPromises);
    
    console.log(`Daily active users report sent to ${recipientsResult.rows.length} recipients`);
    
    return {
      success: true,
      recipientCount: recipientsResult.rows.length,
      reportDate: reportData.reportDate,
      summary: reportData.summary
    };
  } catch (error) {
    console.error('Error processing daily active users report:', error);
    throw error;
  }
};

// Export individual functions for testing and manual execution
export default {
  generateDailyActiveUsersReport,
  sendDailyActiveUsersEmail,
  processDailyActiveUsersReport
};