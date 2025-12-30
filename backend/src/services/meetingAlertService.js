/**
 * Meeting Alert Service
 * 
 * Provides real-time alerting when users experience issues in meetings.
 * Logs errors to database and sends email notifications for critical issues.
 */

import db from '../config/database.js';
import { sendEmail } from './emailService.js';

// Alert configuration
const ALERT_CONFIG = {
  // Email recipient for meeting alerts (platform admin)
  alertEmail: process.env.MEETING_ALERT_EMAIL || 'eric@profitbuildernetwork.com',
  
  // Severity levels that trigger immediate email alerts
  emailAlertSeverities: ['error', 'critical'],
  
  // Throttle: Don't send more than X alerts per org per hour
  throttlePerOrgPerHour: 5,
  
  // Error types and their default severities
  errorTypes: {
    'start_failed': 'error',
    'conclude_failed': 'critical',  // Data loss risk
    'websocket_disconnect': 'warning',
    'transcription_failed': 'warning',
    'snapshot_failed': 'error',
    'data_loss': 'critical',
    'session_orphaned': 'error',
    'unexpected_error': 'error'
  }
};

/**
 * Log a meeting error and optionally send an alert
 */
export const logMeetingError = async ({
  organizationId,
  meetingId = null,
  sessionId = null,
  userId = null,
  errorType,
  errorMessage,
  errorStack = null,
  context = {},
  meetingType = null,
  meetingPhase = null,
  participantsCount = null,
  severity = null
}) => {
  try {
    // Determine severity if not provided
    const finalSeverity = severity || ALERT_CONFIG.errorTypes[errorType] || 'error';
    
    // Enrich context with timestamp and environment
    const enrichedContext = {
      ...context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      serverVersion: process.env.npm_package_version || 'unknown'
    };
    
    // Insert error into database
    const result = await db.query(
      `INSERT INTO meeting_errors (
        organization_id, meeting_id, session_id, user_id,
        error_type, severity, error_message, error_stack, context,
        meeting_type, meeting_phase, participants_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        organizationId, meetingId, sessionId, userId,
        errorType, finalSeverity, errorMessage, errorStack, JSON.stringify(enrichedContext),
        meetingType, meetingPhase, participantsCount
      ]
    );
    
    const errorId = result.rows[0].id;
    
    console.error(`🚨 [MeetingAlert] Logged error ${errorId}: ${errorType} (${finalSeverity}) - ${errorMessage}`);
    
    // Check if we should send an email alert
    if (ALERT_CONFIG.emailAlertSeverities.includes(finalSeverity)) {
      await sendAlertEmail(errorId, {
        organizationId,
        meetingId,
        sessionId,
        userId,
        errorType,
        severity: finalSeverity,
        errorMessage,
        context: enrichedContext,
        meetingType,
        meetingPhase
      });
    }
    
    return errorId;
  } catch (err) {
    // Don't let alert failures break the main flow
    console.error('🚨 [MeetingAlert] Failed to log meeting error:', err.message);
    return null;
  }
};

/**
 * Send an email alert for a meeting error
 */
const sendAlertEmail = async (errorId, errorDetails) => {
  try {
    // Check throttling
    const shouldThrottle = await checkThrottle(errorDetails.organizationId);
    if (shouldThrottle) {
      console.log(`🚨 [MeetingAlert] Throttled alert for org ${errorDetails.organizationId}`);
      return;
    }
    
    // Get organization and user details for context
    const [orgResult, userResult] = await Promise.all([
      db.query('SELECT name FROM organizations WHERE id = $1', [errorDetails.organizationId]),
      errorDetails.userId 
        ? db.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [errorDetails.userId])
        : Promise.resolve({ rows: [] })
    ]);
    
    const orgName = orgResult.rows[0]?.name || 'Unknown Organization';
    const userName = userResult.rows[0] 
      ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name} (${userResult.rows[0].email})`
      : 'Unknown User';
    
    // Build email content
    const severityEmoji = errorDetails.severity === 'critical' ? '🔴' : '🟠';
    const subject = `${severityEmoji} Meeting Alert: ${errorDetails.errorType} at ${orgName}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${errorDetails.severity === 'critical' ? '#dc2626' : '#f97316'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${severityEmoji} Meeting Error Alert</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 140px;">Organization:</td>
              <td style="padding: 8px 0;">${orgName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Error Type:</td>
              <td style="padding: 8px 0;"><code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px;">${errorDetails.errorType}</code></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Severity:</td>
              <td style="padding: 8px 0;"><span style="background: ${errorDetails.severity === 'critical' ? '#dc2626' : '#f97316'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${errorDetails.severity.toUpperCase()}</span></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">User Affected:</td>
              <td style="padding: 8px 0;">${userName}</td>
            </tr>
            ${errorDetails.meetingType ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Meeting Type:</td>
              <td style="padding: 8px 0;">${errorDetails.meetingType}</td>
            </tr>
            ` : ''}
            ${errorDetails.meetingPhase ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Meeting Phase:</td>
              <td style="padding: 8px 0;">${errorDetails.meetingPhase}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Time:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST</td>
            </tr>
          </table>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h3 style="margin-top: 0; color: #374151;">Error Message:</h3>
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 13px; white-space: pre-wrap; word-break: break-word;">
${errorDetails.errorMessage}
          </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            <strong>Error ID:</strong> ${errorId}<br>
            <a href="https://axplatform.app/admin/meeting-health" style="color: #2563eb;">View Meeting Health Dashboard →</a>
          </p>
        </div>
      </div>
    `;
    
    // Send the email
    await sendEmail(ALERT_CONFIG.alertEmail, 'meetingAlert', {
      subject,
      htmlContent,
      errorId,
      orgName,
      errorType: errorDetails.errorType,
      severity: errorDetails.severity
    });
    
    // Mark alert as sent
    await db.query(
      'UPDATE meeting_errors SET alert_sent = TRUE, alert_sent_at = NOW() WHERE id = $1',
      [errorId]
    );
    
    console.log(`🚨 [MeetingAlert] Email alert sent for error ${errorId}`);
  } catch (err) {
    console.error('🚨 [MeetingAlert] Failed to send alert email:', err.message);
  }
};

/**
 * Check if we should throttle alerts for an organization
 */
const checkThrottle = async (organizationId) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM meeting_errors 
       WHERE organization_id = $1 
       AND alert_sent = TRUE 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [organizationId]
    );
    
    return parseInt(result.rows[0].count) >= ALERT_CONFIG.throttlePerOrgPerHour;
  } catch (err) {
    return false; // Don't throttle on error
  }
};

/**
 * Get recent meeting errors for the health dashboard
 */
export const getRecentErrors = async (options = {}) => {
  const {
    organizationId = null,
    hours = 24,
    limit = 50,
    unacknowledgedOnly = false
  } = options;
  
  let query = `
    SELECT 
      me.*,
      o.name as organization_name,
      u.email as user_email,
      u.first_name as user_first_name,
      u.last_name as user_last_name
    FROM meeting_errors me
    LEFT JOIN organizations o ON me.organization_id = o.id
    LEFT JOIN users u ON me.user_id = u.id
    WHERE me.created_at > NOW() - INTERVAL '${hours} hours'
  `;
  
  const params = [];
  
  if (organizationId) {
    params.push(organizationId);
    query += ` AND me.organization_id = $${params.length}`;
  }
  
  if (unacknowledgedOnly) {
    query += ` AND me.acknowledged = FALSE`;
  }
  
  query += ` ORDER BY me.created_at DESC LIMIT ${limit}`;
  
  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Get error statistics for the health dashboard
 */
export const getErrorStats = async (hours = 24) => {
  const result = await db.query(`
    SELECT 
      error_type,
      severity,
      COUNT(*) as count,
      COUNT(DISTINCT organization_id) as orgs_affected
    FROM meeting_errors
    WHERE created_at > NOW() - INTERVAL '${hours} hours'
    GROUP BY error_type, severity
    ORDER BY count DESC
  `);
  
  const totalResult = await db.query(`
    SELECT 
      COUNT(*) as total_errors,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE acknowledged = FALSE) as unacknowledged_count,
      COUNT(DISTINCT organization_id) as orgs_affected
    FROM meeting_errors
    WHERE created_at > NOW() - INTERVAL '${hours} hours'
  `);
  
  return {
    byType: result.rows,
    summary: totalResult.rows[0]
  };
};

/**
 * Acknowledge a meeting error
 */
export const acknowledgeError = async (errorId, userId, notes = null) => {
  const result = await db.query(
    `UPDATE meeting_errors 
     SET acknowledged = TRUE, acknowledged_by = $2, acknowledged_at = NOW(), resolution_notes = $3
     WHERE id = $1
     RETURNING *`,
    [errorId, userId, notes]
  );
  
  return result.rows[0];
};

export default {
  logMeetingError,
  getRecentErrors,
  getErrorStats,
  acknowledgeError
};
