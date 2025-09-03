import sgMail from '@sendgrid/mail';

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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${data.teamName} Meeting Summary</h2>
        <p>Hi Team,</p>
        <p>Here's a summary of your ${data.teamName} meeting on ${data.meetingDate}:</p>
        
        ${data.openTodos && data.openTodos.length > 0 ? `
          <h3 style="color: #d97706; margin-top: 30px; border-bottom: 2px solid #f8f9fa; padding-bottom: 10px;">📋 Open To-Dos</h3>
          <ul style="color: #333; line-height: 1.8;">
            ${data.openTodos.map(todo => `<li><strong>${todo.title}</strong> - Assigned to: ${todo.assignee}${todo.dueDate !== 'No due date' ? `, Due: <span style="${todo.isPastDue ? 'color: #dc2626; font-weight: bold;' : ''}">${todo.dueDate}${todo.isPastDue ? ' (PAST DUE)' : ''}</span>` : ''}</li>`).join('')}
          </ul>
        ` : `
          <p style="color: #666; margin-top: 30px;">No open to-dos at this time.</p>
        `}
        
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This summary was automatically generated by AXP.
        </p>
      </div>
    `,
    text: `
      ${data.teamName} Meeting Summary
      
      Hi Team,
      
      Here's a summary of your ${data.teamName} meeting on ${data.meetingDate}:
      
      ${data.openTodos && data.openTodos.length > 0 ? `OPEN TO-DOS:\n${data.openTodos.map(t => `- ${t.title} - Assigned to: ${t.assignee}${t.dueDate !== 'No due date' ? `, Due: ${t.dueDate}${t.isPastDue ? ' (PAST DUE)' : ''}` : ''}`).join('\n')}\n\n` : 'No open to-dos at this time.\n\n'}
      
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