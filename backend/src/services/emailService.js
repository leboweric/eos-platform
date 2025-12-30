import sgMail from '@sendgrid/mail';
import db from '../config/database.js';
import failedOperationsService from './failedOperationsService.js';
import { logMeetingError } from './meetingAlertService.js';

// Function to fetch AI summary for meeting emails
async function getAISummaryForMeeting(meetingId, organizationId) {
  try {
    const result = await db.query(`
      SELECT 
        mas.executive_summary,
        mas.action_items,
        mas.key_decisions,
        mas.issues_discussed,
        mt.word_count,
        mt.meeting_id
      FROM meeting_ai_summaries mas
      JOIN meeting_transcripts mt ON mas.transcript_id = mt.id
      WHERE mt.organization_id = $1
        AND mt.status = 'completed'
        AND mt.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY mas.created_at DESC
      LIMIT 1
    `, [organizationId]);
    
    if (result.rows.length > 0) {
      const summary = result.rows[0];
      
      // Parse JSON fields if they're strings
      let actionItems = summary.action_items;
      let keyDecisions = summary.key_decisions;
      let issuesDiscussed = summary.issues_discussed;
      
      if (typeof actionItems === 'string') {
        try {
          actionItems = JSON.parse(actionItems);
        } catch (e) {
          actionItems = [];
        }
      }
      
      if (typeof keyDecisions === 'string') {
        try {
          keyDecisions = JSON.parse(keyDecisions);
        } catch (e) {
          keyDecisions = [];
        }
      }
      
      if (typeof issuesDiscussed === 'string') {
        try {
          issuesDiscussed = JSON.parse(issuesDiscussed);
        } catch (e) {
          issuesDiscussed = [];
        }
      }
      
      return {
        executive_summary: summary.executive_summary,
        action_items: actionItems || [],
        key_decisions: keyDecisions || [],
        issues_discussed: issuesDiscussed || [],
        word_count: summary.word_count,
        meeting_id: summary.meeting_id
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error fetching AI summary for email:', error);
    return null;
  }
}

// Generate meeting summary HTML (reusable for both emails and web viewing)
export const generateMeetingSummaryHTML = (meetingData) => {
  // Debug logging to track what the template receives
  console.log('📧 ===== EMAIL TEMPLATE DEBUG =====');
  console.log('📧 Meeting data summary:', { 
    teamName: meetingData.teamName,
    meetingType: meetingData.meetingType,
    hasIssues: !!meetingData.issues,
    hasTodos: !!meetingData.todos,
    hasHeadlines: !!meetingData.headlines,
    hasCascadingMessages: !!meetingData.cascadingMessages
  });
  
  const {
    teamName,
    meetingType,
    meetingDate,
    duration,
    rating,
    facilitatorName,
    organizationName,
    themeColor = '#6366f1', // Default fallback color
    aiSummary,
    headlines = { customer: [], employee: [] },
    cascadingMessages = [],
    issues = { solved: [], new: [] },
    todos = { completed: [], new: [] },
    attendees = []
  } = meetingData;
  
  console.log('📧 Content counts:', {
    issuesSolved: issues.solved?.length || 0,
    issuesNew: issues.new?.length || 0,
    todosCompleted: todos.completed?.length || 0,
    todosNew: todos.new?.length || 0,
    headlinesCustomer: headlines.customer?.length || 0,
    headlinesEmployee: headlines.employee?.length || 0,
    cascadingMessages: cascadingMessages?.length || 0
  });
  console.log('📧 ===== END EMAIL TEMPLATE DEBUG =====');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Summary - ${teamName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #374151;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      background: ${themeColor};
      color: white;
      padding: 32px 40px;
      border-bottom: 3px solid rgba(0,0,0,0.1);
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .header-subtitle {
      font-size: 18px;
      opacity: 0.95;
      margin-bottom: 12px;
    }
    
    .header-meta {
      font-size: 16px;
      opacity: 0.9;
    }
    
    .content {
      padding: 48px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section:last-child {
      margin-bottom: 0;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-top: 32px;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #d1d5db;
    }
    
    .ai-summary-box {
      background: #f9fafb;
      border-left: 4px solid #111827;
      padding: 24px;
      margin-bottom: 32px;
      border-radius: 4px;
    }
    
    .ai-summary-box p {
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
      margin: 0;
    }
    
    .list {
      list-style: none;
      padding-left: 0;
    }
    
    .list li {
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
      padding: 12px 0;
      margin-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: flex-start;
    }
    
    .list li:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .list li:before {
      content: "•";
      color: #6b7280;
      font-weight: bold;
      font-size: 18px;
      margin-right: 12px;
      flex-shrink: 0;
      line-height: 1.6;
    }
    
    .list-item-title {
      font-weight: 500;
      color: #111827;
      margin-bottom: 4px;
    }
    
    .list-item-meta {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }
    
    .rating-display {
      font-size: 16px;
      color: #374151;
      padding: 12px 0;
    }
    
    .rating-stars {
      color: #fbbf24;
      font-size: 20px;
      margin-right: 8px;
    }
    
    .empty-state {
      color: #9ca3af;
      font-style: italic;
      text-align: center;
      padding: 32px 0;
      font-size: 16px;
    }
    
    .subsection {
      margin-top: 24px;
    }
    
    .subsection-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
    }
    
    .two-column-table {
      width: 100%;
      margin-top: 16px;
      table-layout: fixed;
    }
    
    .two-column-table td {
      width: 48%;
      vertical-align: top;
    }
    
    .two-column-table td:first-child {
      padding-right: 2%;
    }
    
    .two-column-table td:last-child {
      padding-left: 2%;
    }
    
    @media print {
      body {
        background: white;
      }
      .header {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>${teamName}</h1>
      <div class="header-subtitle">${meetingType}</div>
      <div class="header-meta">
        ${new Date(meetingDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} • ${duration} minutes${facilitatorName ? ` • Facilitated by ${facilitatorName}` : ''}
      </div>
    </div>

    <div class="content">
      <!-- AI SUMMARY - FIRST SECTION -->
      ${aiSummary ? `
        <div class="ai-summary-box">
          <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 12px;">Executive Summary</h2>
          <p>${aiSummary}</p>
        </div>
      ` : ''}

      <!-- HEADLINES -->
      ${(() => {
        // Combine customer and employee headlines into single list (matches Meeting History snapshot)
        const allHeadlines = [
          ...(headlines.customer || []),
          ...(headlines.employee || [])
        ];
        
        return allHeadlines.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Headlines</h2>
            <ul class="list">
              ${allHeadlines.map(headline => `
                <li>
                  <div class="list-item-title">${headline.headline || headline.title || headline.text || headline}</div>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : '';
      })()}

      <!-- CASCADING MESSAGES -->
      ${cascadingMessages?.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Cascading Messages</h2>
          <ul class="list">
            ${cascadingMessages.map(msg => `
              <li>
                <div class="list-item-title">${msg.message || msg}</div>
                ${msg.from ? `<div class="list-item-meta">From: ${msg.from}</div>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- ISSUES SECTION (TWO COLUMN) -->
      ${(issues.solved?.length > 0 || issues.new?.length > 0) ? `
        <div class="section">
          <h2 class="section-title">Issues</h2>
          <table class="two-column-table">
            <tr>
              <td>
                <div class="subsection-title">Solved Issues</div>
                ${issues.solved?.length > 0 ? `
                  <ul class="list">
                    ${issues.solved.map(issue => `
                      <li>
                        <div class="list-item-title">${issue.title || issue.description || issue}</div>
                        ${issue.owner ? `<div class="list-item-meta">Owner: ${issue.owner}</div>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                ` : `
                  <div class="empty-state">No issues solved</div>
                `}
              </td>
              <td>
                <div class="subsection-title">New Issues</div>
                ${issues.new?.length > 0 ? `
                  <ul class="list">
                    ${issues.new.map(issue => `
                      <li>
                        <div class="list-item-title">${issue.title || issue.description || issue}</div>
                        ${issue.owner ? `<div class="list-item-meta">Owner: ${issue.owner}</div>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                ` : `
                  <div class="empty-state">No new issues</div>
                `}
              </td>
            </tr>
          </table>
        </div>
      ` : ''}

      <!-- TO-DOS SECTION (TWO COLUMN) -->
      ${(todos.completed?.length > 0 || todos.new?.length > 0) ? `
        <div class="section">
          <h2 class="section-title">To-Dos</h2>
          <table class="two-column-table">
            <tr>
              <td>
                <div class="subsection-title">Completed To-Dos</div>
                ${todos.completed?.length > 0 ? `
                  <ul class="list">
                    ${todos.completed.map(todo => `
                      <li>
                        <div class="list-item-title">${todo.title || todo.description || todo}</div>
                        ${todo.assignee ? `<div class="list-item-meta">Completed by: ${todo.assignee}</div>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                ` : `
                  <div class="empty-state">No completed to-dos</div>
                `}
              </td>
              <td>
                <div class="subsection-title">New To-Dos</div>
                ${todos.new?.length > 0 ? `
                  <ul class="list">
                    ${todos.new.map(todo => `
                      <li>
                        <div class="list-item-title">${todo.title || todo.description || todo}</div>
                        <div class="list-item-meta">
                          ${todo.assignee ? `Assigned to: ${todo.assignee}` : ''}
                          ${todo.assignee && todo.dueDate ? ' • ' : ''}
                          ${todo.dueDate ? `Due: ${new Date(todo.dueDate).toLocaleDateString()}` : ''}
                        </div>
                      </li>
                    `).join('')}
                  </ul>
                ` : `
                  <div class="empty-state">No new to-dos</div>
                `}
              </td>
            </tr>
          </table>
        </div>
      ` : ''}

      <!-- MEETING RATING - Removed to match Meeting History snapshot display -->
    </div>
  </div>
</body>
</html>
  `;
};

// Email templates
const templates = {
  invitation: (data) => ({
    subject: `You're invited to join ${data.organizationName} on AXP`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${data.organizationName}</h2>
        <p>Hi there,</p>
        <p>${data.invitedByName} has invited you to join ${data.organizationName} on AXP as a ${data.role}.</p>
        <p>Click the button below to accept your invitation and create your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invitationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${data.invitationLink}</p>
      </div>
    `,
    text: `
      You're invited to join ${data.organizationName} on AXP
      
      ${data.invitedByName} has invited you to join ${data.organizationName} as a ${data.role}.
      
      Accept your invitation here: ${data.invitationLink}
      
      This invitation will expire in 7 days.
    `
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your Password - AXP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hi ${data.firstName},</p>
        <p>We received a request to reset your password for your AXP account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color: #666; font-size: 14px;">If you're having trouble clicking the button, copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 12px; word-break: break-all;">${data.resetLink}</p>
      </div>
    `,
    text: `
      Reset Your Password
      
      Hi ${data.firstName},
      
      We received a request to reset your password for your AXP account.
      
      Reset your password here: ${data.resetLink}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request a password reset, you can safely ignore this email.
    `
  }),

  trialReminder: (data) => ({
    subject: `Your AXP trial ends in ${data.daysRemaining} days`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your trial is ending soon</h2>
        <p>Hi ${data.firstName},</p>
        <p>Your free trial for ${data.organizationName} ends in <strong>${data.daysRemaining} days</strong>.</p>
        <p>After your trial ends, you'll be charged $${data.monthlyTotal}/month for ${data.userCount} users.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.billingUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Billing Details
          </a>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
      </div>
    `,
    text: `
      Your trial is ending soon
      
      Hi ${data.firstName},
      
      Your free trial for ${data.organizationName} ends in ${data.daysRemaining} days.
      
      After your trial ends, you'll be charged $${data.monthlyTotal}/month for ${data.userCount} users.
      
      View billing details: ${data.billingUrl}
    `
  }),

  paymentFailed: (data) => ({
    subject: 'Payment failed - Action required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Payment Failed</h2>
        <p>Hi ${data.firstName},</p>
        <p>We were unable to process your payment for ${data.organizationName}.</p>
        <p>Please update your payment method to avoid service interruption.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.billingUrl}" style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </div>
      </div>
    `,
    text: `
      Payment Failed
      
      Hi ${data.firstName},
      
      We were unable to process your payment for ${data.organizationName}.
      
      Please update your payment method to avoid service interruption.
      
      Update payment method: ${data.billingUrl}
    `
  }),

  clientWelcome: (data) => ({
    subject: `Welcome to AXP - ${data.organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to AXP!</h2>
        <p>Hi ${data.firstName},</p>
        <p>Your Strategy Consultant, ${data.consultantName}, has created an account for ${data.organizationName} on AXP.</p>
        <p>Here are your login credentials:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Temporary Password:</strong> ${data.tempPassword}</p>
        </div>
        <p style="color: #DC2626;"><strong>Important:</strong> Please change your password after your first login.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Log In to AXP
          </a>
        </div>
        <p>AXP will help you implement proven business strategies in your organization.</p>
        <p>If you have any questions, please contact your Strategy Consultant.</p>
      </div>
    `,
    text: `
      Welcome to AXP!
      
      Hi ${data.firstName},
      
      Your Strategy Consultant, ${data.consultantName}, has created an account for ${data.organizationName} on AXP.
      
      Your login credentials:
      Email: ${data.email}
      Temporary Password: ${data.tempPassword}
      
      Important: Please change your password after your first login.
      
      Log in here: ${data.loginUrl}
      
      AXP will help you implement proven business strategies in your organization.
    `
  }),

  'user-created': (data) => ({
    subject: `Your account has been created - ${data.organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to AXP!</h2>
        <p>Hi ${data.firstName},</p>
        <p>${data.createdByName} has created an account for you to access ${data.organizationName}'s business management system.</p>
        <p>Here are your login credentials:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${data.temporaryPassword}</p>
        </div>
        <p style="color: #DC2626; font-weight: bold;">Important: Please change your password after your first login.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Log In Now
          </a>
        </div>
        <p>If you have any questions, please contact ${data.createdByName} or your organization administrator.</p>
      </div>
    `,
    text: `
      Welcome to AXP!
      
      Hi ${data.firstName},
      
      ${data.createdByName} has created an account for you to access ${data.organizationName}'s business management system.
      
      Your login credentials:
      Email: ${data.email}
      Temporary Password: ${data.temporaryPassword}
      
      Important: Please change your password after your first login.
      
      Log in here: ${data.loginUrl}
      
      If you have any questions, please contact ${data.createdByName} or your organization administrator.
    `
  }),

  todoReminder: (data) => ({
    subject: `To-Do Reminder - ${data.teamName} - ${data.organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📋 Weekly To-Do Reminder</h2>
        <p>Hi Team,</p>
        <p>Your next ${data.teamName} meeting is tomorrow. Here are your open to-dos:</p>
        
        ${data.openTodos && data.openTodos.length > 0 ? `
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">⚠️ Open To-Dos (${data.openTodos.length} items)</h3>
            <ul style="color: #333; line-height: 2;">
              ${data.openTodos.map(todo => `
                <li style="margin-bottom: 8px;">
                  <strong>${todo.title}</strong><br/>
                  <span style="color: #666; font-size: 14px;">
                    Assigned to: ${todo.assignee}
                    ${todo.dueDate !== 'No due date' ? `<br/>Due: <span style="color: ${new Date(todo.dueDate) < new Date() ? '#dc2626' : '#059669'};">${todo.dueDate}</span>` : ''}
                  </span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : `
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #065f46; margin: 0;">✅ Great job! All to-dos are complete.</p>
          </div>
        `}
        
        <p style="color: #666; margin-top: 30px;">
          <em>This is your weekly reminder sent 6 days after your last meeting. Please review and update your to-dos before tomorrow's meeting.</em>
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.meetingLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View All To-Dos
          </a>
        </div>
      </div>
    `,
    text: `
      Weekly To-Do Reminder
      
      Hi Team,
      
      Your next ${data.teamName} meeting is tomorrow. Here are your open to-dos:
      
      ${data.openTodos && data.openTodos.length > 0 ? `OPEN TO-DOS (${data.openTodos.length} items):\n${data.openTodos.map(t => `- ${t.title}\n  Assigned to: ${t.assignee}${t.dueDate !== 'No due date' ? `\n  Due: ${t.dueDate}` : ''}`).join('\n\n')}\n\n` : 'Great job! All to-dos are complete.\n\n'}
      
      This is your weekly reminder sent 6 days after your last meeting. Please review and update your to-dos before tomorrow's meeting.
      
      View all to-dos: ${data.meetingLink}
    `
  }),

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
          <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/todos" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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

  // OLD TEMPLATE - DEPRECATED: Use sendMeetingSummary() function instead
  // meetingSummary: (data) => ({
  //   subject: `${data.teamName} Meeting Summary - ${data.organizationName}`,
  //   html: generateMeetingSummaryHTML(data),
  //   text: `Meeting summary text content...`
  // }),
  
  // Meeting error alert template
  meetingAlert: (data) => ({
    subject: data.subject,
    html: data.htmlContent,
    text: `Meeting Error Alert\n\nOrganization: ${data.orgName}\nError Type: ${data.errorType}\nSeverity: ${data.severity}\nError ID: ${data.errorId}\n\nView details at: https://axplatform.app/admin/meeting-health`
  })
};

// Send email function
export const sendEmail = async (to, templateName, data) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent to:', to);
    console.log('Email data:', { templateName, data });
    return;
  }

  // Set API key when sending (ensures it's loaded from env)
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    let emailContent;
    
    // Handle special case for dailyActiveUsers where content is pre-formatted
    if (templateName === 'dailyActiveUsers') {
      emailContent = {
        subject: data.subject || 'Daily Active Users Report',
        html: data.htmlContent,
        text: data.textContent
      };
    } else if (templateName === 'meetingSummary') {
      // DEPRECATED: Use sendMeetingSummary() function instead for unified template
      throw new Error(`meetingSummary template is deprecated. Use emailService.sendMeetingSummary() instead.`);
    } else {
      const template = templates[templateName];
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }
      emailContent = template(data);
    }
    
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axp.com',
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
    
    // Track successful email send for monitoring
    global.lastEmailSend = Date.now();
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Track failed email send for monitoring
    global.lastEmailError = Date.now();
    
    // Log failure to database
    await failedOperationsService.logEmailFailure(
      to,
      templateName,
      error,
      {
        organizationId: data?.organizationId,
        userId: data?.userId,
        subject: emailContent?.subject
      }
    );
    
    throw error;
  }
};

// Send meeting summary using the unified template
export const sendMeetingSummary = async (recipients, meetingData) => {
  try {
    // Use the same HTML generator as Meeting History
    const htmlContent = generateMeetingSummaryHTML(meetingData);
    
    const msg = {
      to: recipients,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
        name: 'AXP Platform'
      },
      subject: `Meeting Summary: ${meetingData.teamName} - ${meetingData.meetingType}`,
      html: htmlContent
    };

    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email not sent to:', recipients);
      console.log('Email data:', { subject: msg.subject, meetingData });
      return { success: true };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send(msg);
    console.log(`Meeting summary email sent to ${recipients.length} recipients`);
    
    // Track successful email send
    global.lastEmailSend = Date.now();
    
    return { success: true };
  } catch (error) {
    console.error('Error sending meeting summary email:', error);
    
    // Track failed email send
    global.lastEmailError = Date.now();
    
    // Log to meeting alert system
    logMeetingError({
      organizationId: meetingData?.organizationId,
      errorType: 'meeting_summary_email_failed',
      severity: 'warning',
      errorMessage: `Failed to send meeting summary email: ${error.message}`,
      context: { 
        teamName: meetingData?.teamName,
        meetingType: meetingData?.meetingType,
        recipientCount: Array.isArray(recipients) ? recipients.length : 1
      },
      meetingPhase: 'email'
    }).catch(err => console.error('Failed to log email error:', err));
    
    // Log failure to database
    await failedOperationsService.logEmailFailure(
      Array.isArray(recipients) ? recipients.join(', ') : recipients,
      'meeting_summary',
      error,
      {
        organizationId: meetingData?.organizationId,
        teamName: meetingData?.teamName,
        meetingType: meetingData?.meetingType
      }
    );
    
    throw error;
  }
};

export const emailService = { sendEmail, generateMeetingSummaryHTML, sendMeetingSummary };
export default { sendEmail, generateMeetingSummaryHTML, sendMeetingSummary };