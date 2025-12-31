/**
 * Error Alert Service
 * Monitors Railway logs for errors and sends email alerts
 */

import sgMail from '@sendgrid/mail';
import railwayService from './railwayService.js';

// Configuration
const ALERT_EMAIL = process.env.ERROR_ALERT_EMAIL || 'eric@profitbuildernetwork.com';
const CHECK_INTERVAL_MINUTES = 5;

// Track last check time to avoid duplicate alerts
let lastCheckTime = null;

/**
 * Generate HTML email for error alert
 */
function generateErrorAlertHTML(errors, checkPeriod) {
  const errorCount = errors.length;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AXP Error Alert</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: #dc2626;
      color: white;
      padding: 20px 24px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 8px 0 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .summary {
      background: #fef2f2;
      border-left: 4px solid #dc2626;
      padding: 16px;
      margin-bottom: 24px;
      border-radius: 0 4px 4px 0;
    }
    .error-item {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .error-header {
      background: #fef2f2;
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .error-time {
      font-size: 14px;
      color: #6b7280;
    }
    .error-badge {
      background: #dc2626;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .error-message {
      padding: 16px;
      background: #1f2937;
      color: #f3f4f6;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 200px;
      overflow-y: auto;
    }
    .footer {
      padding: 16px 24px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ AXP Error Alert</h1>
      <p>${errorCount} error${errorCount !== 1 ? 's' : ''} detected in the last ${checkPeriod} minutes</p>
    </div>
    
    <div class="content">
      <div class="summary">
        <strong>Summary:</strong> ${errorCount} backend error${errorCount !== 1 ? 's' : ''} occurred between 
        ${new Date(Date.now() - checkPeriod * 60 * 1000).toLocaleString()} and ${new Date().toLocaleString()}
      </div>
      
      ${errors.map(error => `
        <div class="error-item">
          <div class="error-header">
            <span class="error-time">${new Date(error.timestamp).toLocaleString()}</span>
            <span class="error-badge">ERROR</span>
          </div>
          <div class="error-message">${escapeHtml(error.message)}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p>View full logs: <a href="https://axplatform.app/admin/railway-logs">Railway Logs Dashboard</a></p>
      <p>This alert was generated automatically by AXP Error Monitoring.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate plain text version of error alert
 */
function generateErrorAlertText(errors, checkPeriod) {
  let text = `AXP ERROR ALERT\n`;
  text += `${'='.repeat(50)}\n\n`;
  text += `${errors.length} error(s) detected in the last ${checkPeriod} minutes\n\n`;
  
  errors.forEach((error, index) => {
    text += `--- Error ${index + 1} ---\n`;
    text += `Time: ${new Date(error.timestamp).toLocaleString()}\n`;
    text += `Message: ${error.message}\n\n`;
  });
  
  text += `\nView full logs: https://axplatform.app/admin/railway-logs\n`;
  
  return text;
}

/**
 * Send error alert email
 */
async function sendErrorAlert(errors) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[ErrorAlert] SendGrid API key not configured. Alert not sent.');
    console.log('[ErrorAlert] Would have sent alert for', errors.length, 'errors');
    return false;
  }
  
  if (!errors || errors.length === 0) {
    return false;
  }
  
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: ALERT_EMAIL,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
      name: 'AXP Error Monitor'
    },
    subject: `⚠️ AXP Alert: ${errors.length} Error${errors.length !== 1 ? 's' : ''} Detected`,
    html: generateErrorAlertHTML(errors, CHECK_INTERVAL_MINUTES),
    text: generateErrorAlertText(errors, CHECK_INTERVAL_MINUTES)
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[ErrorAlert] Alert sent to ${ALERT_EMAIL} for ${errors.length} errors`);
    return true;
  } catch (error) {
    console.error('[ErrorAlert] Failed to send alert:', error.message);
    return false;
  }
}

/**
 * Check for new errors and send alert if found
 * This is called by the cron job
 */
async function checkAndAlert() {
  try {
    console.log('[ErrorAlert] Checking for new errors...');
    
    // Calculate time window
    const now = new Date();
    const checkFrom = lastCheckTime || new Date(now.getTime() - CHECK_INTERVAL_MINUTES * 60 * 1000);
    
    // Get recent errors from Railway
    const errors = await railwayService.getRecentErrors(100);
    
    // Filter to only errors within our time window
    const newErrors = errors.filter(error => {
      const errorTime = new Date(error.timestamp);
      return errorTime > checkFrom;
    });
    
    // Update last check time
    lastCheckTime = now;
    
    if (newErrors.length > 0) {
      console.log(`[ErrorAlert] Found ${newErrors.length} new errors`);
      await sendErrorAlert(newErrors);
    } else {
      console.log('[ErrorAlert] No new errors found');
    }
    
    return { checked: true, errorsFound: newErrors.length };
  } catch (error) {
    console.error('[ErrorAlert] Error during check:', error.message);
    return { checked: false, error: error.message };
  }
}

/**
 * Initialize the error alert cron job
 */
function initErrorAlertCron() {
  // Run check every 5 minutes
  const intervalMs = CHECK_INTERVAL_MINUTES * 60 * 1000;
  
  console.log(`[ErrorAlert] ⏰ Error alert job scheduled - runs every ${CHECK_INTERVAL_MINUTES} minutes`);
  console.log(`[ErrorAlert] 📧 Alerts will be sent to: ${ALERT_EMAIL}`);
  
  // Set initial last check time to now (don't alert on startup)
  lastCheckTime = new Date();
  
  // Schedule the recurring check
  setInterval(checkAndAlert, intervalMs);
  
  return true;
}

export default {
  checkAndAlert,
  sendErrorAlert,
  initErrorAlertCron,
};

export {
  checkAndAlert,
  sendErrorAlert,
  initErrorAlertCron,
};
