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

// Generate meeting summary HTML (reusable for both emails and web viewing)
export const generateMeetingSummaryHTML = (data) => {
  // Extract organization theme colors if available
  const primaryColor = data.organizationTheme?.primaryColor || '#2563eb';
  const secondaryColor = data.organizationTheme?.secondaryColor || '#3b82f6';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Summary - ${data.teamName || 'Team Meeting'}</title>
  <style>
    /* Modern CSS Reset & Base Styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      min-height: 100vh;
    }
    
    /* Theme-aware CSS Variables */
    :root {
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #64748b;
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --border-light: #e2e8f0;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --danger-color: #ef4444;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-muted: #94a3b8;
        --bg-primary: #1e293b;
        --bg-secondary: #0f172a;
        --border-light: #334155;
      }
      
      body {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
    }
    
    /* Container & Layout */
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--bg-primary);
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
      margin-top: 2rem;
      margin-bottom: 2rem;
    }
    
    /* Professional Header */
    .header {
      background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23grid)"/></svg>');
      opacity: 0.3;
    }
    
    .header-content {
      position: relative;
      z-index: 1;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      letter-spacing: -0.025em;
    }
    
    .header-subtitle {
      font-size: 1.125rem;
      opacity: 0.9;
      font-weight: 500;
    }
    
    .meeting-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 1rem;
      backdrop-filter: blur(10px);
    }
    
    /* AI Summary Hero Section */
    .ai-summary-section {
      padding: 2.5rem 2rem;
      background: linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%);
      border-bottom: 1px solid var(--border-light);
    }
    
    .ai-summary-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .ai-icon {
      width: 3rem;
      height: 3rem;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .ai-summary-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      flex: 1;
    }
    
    .meeting-status {
      background: #dcfce7;
      color: #166534;
      padding: 0.5rem 1rem;
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    
    .ai-summary-text {
      font-size: 1.125rem;
      line-height: 1.8;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }
    
    /* Meeting Metrics */
    .metrics-section {
      padding: 2rem;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-light);
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    
    .metric-card {
      background: var(--bg-primary);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
      border: 1px solid var(--border-light);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    }
    
    .metric-icon {
      font-size: 2rem;
      margin-bottom: 0.75rem;
    }
    
    .metric-value {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }
    
    .metric-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    /* Content Sections */
    .content-section {
      padding: 2rem;
      border-bottom: 1px solid var(--border-light);
    }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .section-icon {
      font-size: 1.5rem;
    }
    
    /* Lists */
    .content-list {
      list-style: none;
      space-y: 1rem;
    }
    
    .content-list li {
      padding: 1rem;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      border-left: 4px solid var(--primary-color);
      transition: background-color 0.2s ease;
    }
    
    .content-list li:hover {
      background: #f1f5f9;
    }
    
    .item-title {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    
    .item-meta {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .status-completed {
      background: #dcfce7;
      color: #166534;
    }
    
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    
    .status-solved {
      background: #dbeafe;
      color: #1e40af;
    }
    
    /* Meeting Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 1rem;
    }
    
    .info-card {
      background: var(--bg-secondary);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--border-light);
    }
    
    .info-label {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    
    .info-value {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    /* Rating Section */
    .rating-display {
      text-align: center;
      padding: 2rem;
    }
    
    .rating-score {
      display: inline-block;
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: white;
      padding: 1rem 2rem;
      border-radius: 16px;
      font-size: 3rem;
      font-weight: 800;
      box-shadow: 0 10px 15px rgba(16, 185, 129, 0.3);
      margin-bottom: 1rem;
    }
    
    .rating-text {
      font-size: 1.125rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    
    /* Footer */
    .footer {
      padding: 2rem;
      text-align: center;
      background: var(--bg-secondary);
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    
    .footer-brand {
      font-weight: 600;
      color: var(--primary-color);
    }
    
    /* Print Styles */
    @media print {
      body {
        background: white;
      }
      
      .container {
        box-shadow: none;
        margin: 0;
        border-radius: 0;
      }
      
      .header {
        background: var(--primary-color) !important;
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
      }
    }
    
    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      
      .header {
        padding: 2rem 1rem;
      }
      
      .header h1 {
        font-size: 2rem;
      }
      
      .content-section,
      .ai-summary-section,
      .metrics-section {
        padding: 1.5rem 1rem;
      }
      
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      
      .info-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Professional Header -->
    <header class="header">
      <div class="header-content">
        <h1>Meeting Summary</h1>
        <div class="header-subtitle">${data.teamName || 'Team Meeting'}</div>
        <div class="meeting-badge">${new Date(data.meetingDate || Date.now()).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
      </div>
    </header>
    
    <!-- AI Summary Section -->
    <section class="ai-summary-section">
      <div class="ai-summary-header">
        <div class="ai-icon">🤖</div>
        <h2 class="ai-summary-title">AI Meeting Summary</h2>
        <span class="meeting-status">Productive Session</span>
      </div>
      
      <p class="ai-summary-text">
        ${data.aiSummary || data.meetingSummary || 'This productive team meeting focused on strategic alignment and operational excellence. The team successfully reviewed key priorities, addressed critical issues, and established clear action items with defined ownership and timelines.'}
      </p>
    </section>
    
    <!-- Meeting Metrics -->
    <section class="metrics-section">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon">📈</div>
          <div class="metric-value">${data.headlines?.length || 0}</div>
          <div class="metric-label">Headlines Shared</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">🔥</div>
          <div class="metric-value">${data.issues?.length || 0}</div>
          <div class="metric-label">Issues Addressed</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">✅</div>
          <div class="metric-value">${data.solvedIssues?.length || data.issues?.filter(i => i.status === 'solved')?.length || 0}</div>
          <div class="metric-label">Issues Solved</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">🎯</div>
          <div class="metric-value">${data.completedTodos?.length || data.todos?.filter(t => t.completed)?.length || 0}</div>
          <div class="metric-label">Todos Completed</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon">📋</div>
          <div class="metric-value">${data.newTodos?.length || data.todos?.filter(t => !t.completed)?.length || 0}</div>
          <div class="metric-label">New Todos</div>
        </div>
      </div>
    </section>
    
    <!-- Meeting Details -->
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">📋</span>
        Meeting Information
      </h2>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-label">Team</div>
          <div class="info-value">${data.teamName || 'Leadership Team'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Organization</div>
          <div class="info-value">${data.organizationName || 'Organization'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Facilitator</div>
          <div class="info-value">${data.facilitatorName || 'Team Leader'}</div>
        </div>
        <div class="info-card">
          <div class="info-label">Duration</div>
          <div class="info-value">${data.duration || '60 minutes'}</div>
        </div>
      </div>
    </section>
    
    <!-- Headlines Section -->
    ${data.headlines && data.headlines.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">📰</span>
        Headlines & Updates
      </h2>
      <ul class="content-list">
        ${data.headlines.map(headline => `
          <li>
            <div class="item-title">${typeof headline === 'object' ? headline.text || headline.title : headline}</div>
            ${typeof headline === 'object' && headline.owner ? `<div class="item-meta">Shared by: ${headline.owner}</div>` : ''}
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- Cascaded Messages -->
    ${data.cascadedMessages && data.cascadedMessages.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">📢</span>
        Cascaded Messages
      </h2>
      <ul class="content-list">
        ${data.cascadedMessages.map(message => `
          <li>
            <div class="item-title">${typeof message === 'object' ? message.text || message.title : message}</div>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- Solved Issues -->
    ${data.solvedIssues && data.solvedIssues.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">✅</span>
        Issues Resolved
      </h2>
      <ul class="content-list">
        ${data.solvedIssues.map(issue => `
          <li>
            <div class="item-title">${typeof issue === 'object' ? issue.title || issue.text : issue}</div>
            <div class="item-meta">
              <span class="status-badge status-solved">Resolved</span>
              ${typeof issue === 'object' && issue.owner ? ` • Owner: ${issue.owner}` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- New Issues -->
    ${data.newIssues && data.newIssues.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">🔥</span>
        New Issues Identified
      </h2>
      <ul class="content-list">
        ${data.newIssues.map(issue => `
          <li>
            <div class="item-title">${typeof issue === 'object' ? issue.title || issue.text : issue}</div>
            <div class="item-meta">
              <span class="status-badge status-pending">Open</span>
              ${typeof issue === 'object' && issue.owner ? ` • Owner: ${issue.owner}` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- Completed Todos -->
    ${data.completedTodos && data.completedTodos.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">✅</span>
        Completed Action Items
      </h2>
      <ul class="content-list">
        ${data.completedTodos.map(todo => `
          <li>
            <div class="item-title">${typeof todo === 'object' ? todo.title || todo.text : todo}</div>
            <div class="item-meta">
              <span class="status-badge status-completed">Completed</span>
              ${typeof todo === 'object' && todo.assignee ? ` • Assignee: ${todo.assignee}` : ''}
              ${typeof todo === 'object' && todo.dueDate ? ` • Due: ${new Date(todo.dueDate).toLocaleDateString()}` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- New Todos -->
    ${data.newTodos && data.newTodos.length > 0 ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">🎯</span>
        New Action Items
      </h2>
      <ul class="content-list">
        ${data.newTodos.map(todo => `
          <li>
            <div class="item-title">${typeof todo === 'object' ? todo.title || todo.text : todo}</div>
            <div class="item-meta">
              <span class="status-badge status-pending">Pending</span>
              ${typeof todo === 'object' && todo.assignee ? ` • Assignee: ${todo.assignee}` : ''}
              ${typeof todo === 'object' && todo.dueDate ? ` • Due: ${new Date(todo.dueDate).toLocaleDateString()}` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </section>
    ` : ''}
    
    <!-- Meeting Rating -->
    ${data.rating ? `
    <section class="content-section">
      <h2 class="section-title">
        <span class="section-icon">⭐</span>
        Meeting Effectiveness Rating
      </h2>
      <div class="rating-display">
        <div class="rating-score">${data.rating}<span style="font-size: 1.5rem; opacity: 0.7;">/10</span></div>
        <div class="rating-text">Team rated this meeting as highly effective and productive.</div>
      </div>
    </section>
    ` : ''}
    
    <!-- Footer -->
    <footer class="footer">
      <div>
        <span class="footer-brand">AXP Meeting Intelligence</span> • 
        Professional meeting summaries powered by AI
      </div>
      <div style="margin-top: 0.5rem; opacity: 0.7;">
        Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </footer>
    
  </div>
</body>
</html>`;
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

  meetingSummary: (data) => ({
    subject: `${data.teamName} Meeting Summary - ${data.organizationName}`,
    html: generateMeetingSummaryHTML(data),
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

export const emailService = { sendEmail, generateMeetingSummaryHTML };
export default { sendEmail, generateMeetingSummaryHTML };