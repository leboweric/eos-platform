import sgMail from '@sendgrid/mail';
import db from '../config/database.js';

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

  meetingSummary: (data) => ({
    subject: `${data.teamName} Meeting Summary - ${data.organizationName}`,
    html: `
      <html>
      <head>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6; 
            color: #1f2937;
            background: #f9fafb;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
          }
          
          /* Simplified Header - Solid Color */
          .header { 
            background: #2563eb;
            color: white; 
            padding: 24px;
            text-align: center;
            border-bottom: 4px solid #1d4ed8;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.95;
            font-size: 15px;
          }
          
          /* Hero AI Summary Section - Simplified Colors */
          .ai-hero { 
            background: linear-gradient(to bottom, #f8fafc, #ffffff);
            border: 2px solid #2563eb;
            border-radius: 12px;
            padding: 24px;
            margin: 24px;
          }
          .ai-hero-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .ai-icon {
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
          }
          .ai-hero h2 {
            color: #1f2937;
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            flex: 1;
          }
          .sentiment-badge {
            margin-left: auto;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            background: #d1fae5;
            color: #065f46;
          }
          .ai-summary-text {
            font-size: 16px;
            line-height: 1.7;
            color: #374151;
            margin: 0 0 24px 0;
          }
          
          /* Metrics Dashboard */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin: 24px;
          }
          .metric-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .metric-card.success {
            border-color: #10b981;
            background: #f0fdf4;
          }
          .metric-card.warning {
            border-color: #f59e0b;
            background: #fffbeb;
          }
          .metric-card.danger {
            border-color: #ef4444;
            background: #fef2f2;
          }
          .metric-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }
          .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: #1f2937;
            margin: 8px 0;
          }
          .metric-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          /* AI Subsections */
          .ai-subsection {
            margin: 20px 0;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .ai-subsection-title {
            font-weight: 600;
            color: #2563eb;
            margin: 0 0 12px 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .ai-list {
            margin: 0;
            padding-left: 20px;
          }
          .ai-list li {
            margin: 8px 0;
            color: #374151;
            line-height: 1.6;
          }
          
          /* Improved CTA Buttons */
          .primary-cta {
            display: block;
            background: #2563eb;
            color: white;
            padding: 16px 32px;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            font-size: 16px;
            text-decoration: none;
            margin: 24px;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
          }
          .secondary-cta {
            display: inline-block;
            background: white;
            color: #2563eb;
            border: 2px solid #2563eb;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            margin: 12px 0;
          }
          
          /* Action Items Card */
          .action-items-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            margin: 24px;
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .card-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            flex: 1;
          }
          .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge.urgent {
            background: #fef2f2;
            color: #dc2626;
          }
          .action-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            border-radius: 8px;
            margin: 12px 0;
          }
          .action-item.overdue {
            background: #fef2f2;
            border-left: 4px solid #dc2626;
          }
          .action-checkbox {
            font-size: 20px;
            margin-top: 2px;
          }
          .action-content {
            flex: 1;
          }
          .action-title {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
          }
          .action-meta {
            font-size: 13px;
            color: #6b7280;
          }
          .view-all-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
          }
          
          /* Standard Sections */
          .section { 
            padding: 24px;
            border-bottom: 1px solid #e5e7eb;
          }
          .section h2 {
            color: #1f2937;
            margin: 0 0 16px 0;
            font-size: 18px;
            font-weight: 600;
          }
          .section-content {
            color: #4b5563;
            font-size: 14px;
          }
          
          /* Meeting Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 16px 0;
          }
          .info-item {
            font-size: 14px;
          }
          .info-label {
            color: #6b7280;
            font-weight: 500;
          }
          .info-value {
            color: #1f2937;
            font-weight: 600;
          }
          
          /* Rating */
          .rating {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 24px;
            font-weight: 700;
          }
          
          /* Lists */
          .simple-list {
            margin: 0;
            padding-left: 20px;
          }
          .simple-list li {
            margin: 10px 0;
            color: #374151;
            line-height: 1.5;
          }
          .overdue {
            color: #dc2626;
            font-weight: 600;
          }
          
          /* Footer */
          .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px; 
            padding: 24px;
            background: #f9fafb;
          }
          .footer a {
            color: #3B82F6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <h1>📊 ${data.teamName} Meeting Summary</h1>
            <p>${data.meetingDate} • ${data.duration || 'Duration not recorded'}</p>
          </div>
          
          <!-- AI SUMMARY SECTION (NEW!) -->
          ${data.aiSummary ? `
            <div class="ai-section">
              <h2>
                🤖 AI Meeting Summary
                <span class="ai-badge">NEW</span>
              </h2>
              
              <p class="ai-summary-text">
                ${data.aiSummary.executive_summary || 'The meeting focused on reviewing key business metrics, addressing open issues, and planning action items for the upcoming period.'}
              </p>
              
              <!-- Key Decisions -->
              ${data.aiSummary.key_decisions && data.aiSummary.key_decisions.length > 0 ? `
                <div class="ai-subsection">
                  <div class="ai-subsection-title">🎯 Key Decisions Made</div>
                  <ul class="ai-list">
                    ${data.aiSummary.key_decisions.map(decision => `<li>${decision}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              <!-- Action Items -->
              ${data.aiSummary.action_items && data.aiSummary.action_items.length > 0 ? `
                <div class="ai-subsection">
                  <div class="ai-subsection-title">📋 Action Items Identified</div>
                  <ul class="ai-list">
                    ${data.aiSummary.action_items.map(item => `
                      <li><strong>${item.assignee || 'Team'}:</strong> ${item.task || item}${item.due_date ? ` - Due: ${item.due_date}` : ''}</li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}
              
              <!-- Issues Discussed -->
              ${data.aiSummary.issues_discussed && data.aiSummary.issues_discussed.length > 0 ? `
                <div class="ai-subsection">
                  <div class="ai-subsection-title">⚠️ Key Issues Discussed</div>
                  <ul class="ai-list">
                    ${data.aiSummary.issues_discussed.slice(0, 3).map(issue => `<li>${issue.issue || issue}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              <div class="ai-footer-note">
                This summary was automatically generated by AI from your ${data.aiSummary.word_count || 'meeting'}-word meeting transcript.
                <br>
                <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/meeting-history" class="view-transcript-btn">
                  📄 View Full Transcript & Insights
                </a>
              </div>
            </div>
          ` : ''}
          
          <!-- Meeting Details -->
          <div class="section">
            <h2>📌 Meeting Details</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Duration</div>
                <div class="info-value">${data.duration || 'Not recorded'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Concluded By</div>
                <div class="info-value">${data.concludedBy || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Rock Completion</div>
                <div class="info-value">${data.rockCompletionPercentage !== undefined ? data.rockCompletionPercentage : 'N/A'}% (${data.completedRocks || 0} of ${data.totalRocks || 0} complete)</div>
              </div>
              <div class="info-item">
                <div class="info-label">Attendees</div>
                <div class="info-value">${data.attendees && data.attendees.length > 0 ? data.attendees.length + ' people' : 'Not recorded'}</div>
              </div>
            </div>
            ${data.attendees && data.attendees.length > 0 ? `
              <p style="margin: 12px 0 0 0; color: #6b7280; font-size: 13px;">
                ${data.attendees.join(', ')}
              </p>
            ` : ''}
          </div>
          
          <!-- Meeting Rating -->
          ${data.rating ? `
            <div class="section">
              <h2>⭐ Meeting Rating</h2>
              <div class="rating" style="background: ${data.rating >= 8 ? '#10b981' : data.rating >= 5 ? '#f59e0b' : '#ef4444'};">${data.rating}/10</div>
              <p style="margin: 12px 0 0 0; color: #374151; font-style: italic;">
                "${data.rating >= 8 ? 'Great meeting!' : data.rating >= 5 ? 'Good meeting' : 'Room for improvement'}"
              </p>
            </div>
          ` : ''}
          
          <!-- Headlines -->
          ${data.headlines && (data.headlines.customer?.length > 0 || data.headlines.employee?.length > 0) ? `
            <div class="section">
              <h2>📰 Headlines</h2>
              ${data.headlines.customer?.length > 0 ? `
                <div style="margin-top: 15px;">
                  <h4 style="color: #059669; margin: 10px 0;">Customer Headlines:</h4>
                  <ul class="simple-list">
                    ${data.headlines.customer.map(h => `<li>${h.text || h}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              ${data.headlines.employee?.length > 0 ? `
                <div style="margin-top: 15px;">
                  <h4 style="color: #7c3aed; margin: 10px 0;">Employee Headlines:</h4>
                  <ul class="simple-list">
                    ${data.headlines.employee.map(h => `<li>${h.text || h}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          
          <!-- Open To-Dos -->
          ${data.openTodos && data.openTodos.length > 0 ? `
            <div class="section">
              <h2>📋 Open To-Dos (${data.openTodos.length})</h2>
              <ul class="simple-list">
                ${data.openTodos.map(todo => `
                  <li>
                    <strong>${todo.title}</strong>
                    <br>
                    <span style="color: #6b7280; font-size: 13px;">
                      Assigned to: ${todo.assignee} • Due: ${todo.dueDate}${todo.isPastDue ? '<span class="overdue"> (OVERDUE)</span>' : ''}
                    </span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <!-- Cascading Messages -->
          ${data.cascadingMessages && data.cascadingMessages.length > 0 ? `
            <div class="section">
              <h2>📢 Cascading Messages</h2>
              <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #7c3aed;">
                ${data.cascadingMessages.map(msg => `
                  <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e9d5ff; ${data.cascadingMessages.indexOf(msg) === data.cascadingMessages.length - 1 ? 'border-bottom: none;' : ''}">
                    <p style="color: #333; margin: 0 0 8px 0; line-height: 1.6;">${msg.message}</p>
                    <p style="color: #9333ea; font-size: 13px; margin: 0; font-weight: 500;">→ Sent to: ${msg.recipientTeams}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Footer -->
          <div class="footer">
            <p>
              <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/meetings">View all meetings</a>
              •
              <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/meeting-history">Meeting history</a>
              •
              <a href="${process.env.FRONTEND_URL || 'https://axplatform.app'}/settings">Email preferences</a>
            </p>
            <p style="margin-top: 12px;">
              This email was automatically generated by AXP Platform<br>
              © 2025 AXP. All rights reserved.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `,
    text: `
      ${data.teamName} Meeting Summary
      
      Hi Team,
      
      Here's a summary of your ${data.teamName} meeting on ${data.meetingDate}:
      
      MEETING DETAILS:
      Duration: ${data.duration || 'Not recorded'}
      Concluded by: ${data.concludedBy || 'Unknown'}
      ${data.attendees && data.attendees.length > 0 ? `Attendees: ${data.attendees.join(', ')}\n` : ''}${data.rockCompletionPercentage !== undefined ? `Rock Completion: ${data.rockCompletionPercentage}% (${data.completedRocks || 0} of ${data.totalRocks || 0} complete)\n` : ''}
      
      ${data.rating ? `MEETING RATING: ${data.rating}/10\n\n` : ''}${data.headlines && (data.headlines.customer?.length > 0 || data.headlines.employee?.length > 0) ? `HEADLINES:\n${data.headlines.customer?.length > 0 ? `Customer Headlines:\n${data.headlines.customer.map(h => `- ${h.text || h}`).join('\n')}\n` : ''}${data.headlines.employee?.length > 0 ? `Employee Headlines:\n${data.headlines.employee.map(h => `- ${h.text || h}`).join('\n')}\n` : ''}\n` : ''}${data.metrics && Object.keys(data.metrics).length > 0 ? `SCORECARD UPDATES:\n${Object.entries(data.metrics).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n` : ''}${data.completedItems && data.completedItems.length > 0 ? `TO-DOS COMPLETED DURING MEETING:\n${data.completedItems.map(i => `- ${i}`).join('\n')}\n\n` : ''}${data.resolvedIssues && data.resolvedIssues.length > 0 ? `ISSUES RESOLVED:\n${data.resolvedIssues.map(i => `- ${i}`).join('\n')}\n\n` : ''}${data.unresolvedIssues && data.unresolvedIssues.length > 0 ? `UNRESOLVED ISSUES:\n${data.unresolvedIssues.map(i => `- ${i}`).join('\n')}\n\n` : ''}${data.openTodos && data.openTodos.length > 0 ? `OPEN TO-DOS:\n${data.openTodos.map(t => `- ${t.title} - Assigned to: ${t.assignee}${t.dueDate !== 'No due date' ? `, Due: ${t.dueDate}${t.isPastDue ? ' (PAST DUE)' : ''}` : ''}`).join('\n')}\n\n` : 'No open to-dos at this time.\n\n'}${data.cascadingMessages && data.cascadingMessages.length > 0 ? `CASCADING MESSAGES:\n${data.cascadingMessages.map(msg => `- ${msg.message}\n  → Sent to: ${msg.recipientTeams}`).join('\n\n')}\n\n` : ''}
      
      This summary was automatically generated by AXP.
    `
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
      // Meeting summary emails - AI summary is now passed from controller
      console.log('📧 [Email] Building meeting summary email');
      
      if (data.aiSummary) {
        console.log('✅ [Email] AI summary included from meeting conclusion');
      } else {
        console.log('⚠️ [Email] No AI summary available - meeting concluded without AI recording');
      }
      
      const template = templates[templateName];
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }
      emailContent = template(data);
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
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export const emailService = { sendEmail };
export default { sendEmail };