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

  meetingSummary: (data) => ({
    subject: `${data.teamName} Meeting Summary - ${data.organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${data.teamName} Meeting Summary</h2>
        <p>Hi Team,</p>
        <p>Here's a summary of your ${data.teamName} meeting on ${data.meetingDate}:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Duration:</strong> ${data.duration}</p>
          <p style="margin: 5px 0;"><strong>Meeting Rating:</strong> ${data.rating}/10</p>
        </div>
        
        ${data.allTodos && data.allTodos.length > 0 ? `
          <h3 style="color: #333; margin-top: 30px;">To Dos:</h3>
          <ul style="color: #666;">
            ${data.allTodos.map(todo => `<li>${todo.title} - ${todo.assignee} - ${todo.dueDate}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${data.attendees && data.attendees.length > 0 ? `
          <h3 style="color: #333; margin-top: 30px;">Attendees</h3>
          <ul style="color: #666;">
            ${data.attendees.map(attendee => `<li>${attendee}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${data.completedItems && data.completedItems.length > 0 ? `
          <h3 style="color: #333; margin-top: 30px;">Completed Items</h3>
          <ul style="color: #666;">
            ${data.completedItems.map(item => `<li>✅ ${item}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${data.newTodos && data.newTodos.length > 0 ? `
          <h3 style="color: #333; margin-top: 30px;">New To-Dos</h3>
          <ul style="color: #666;">
            ${data.newTodos.map(todo => `<li>${todo.title} - Assigned to: ${todo.assignee}, Due: ${todo.dueDate}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${data.issues && data.issues.length > 0 ? `
          <h3 style="color: #333; margin-top: 30px;">Issues Discussed</h3>
          <ul style="color: #666;">
            ${data.issues.map(issue => `<li>${issue}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${data.notes ? `
          <h3 style="color: #333; margin-top: 30px;">Meeting Notes</h3>
          <div style="color: #666; white-space: pre-wrap;">${data.notes}</div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.meetingLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Full Meeting Details
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This summary was automatically generated by AXP.
        </p>
      </div>
    `,
    text: `
      ${data.teamName} Meeting Summary
      
      Hi Team,
      
      Here's a summary of your ${data.teamName} meeting on ${data.meetingDate}:
      
      Duration: ${data.duration}
      Meeting Rating: ${data.rating}/10
      
      ${data.allTodos && data.allTodos.length > 0 ? `To Dos:\n${data.allTodos.map(t => `- ${t.title} - ${t.assignee} - ${t.dueDate}`).join('\n')}\n\n` : ''}
      ${data.attendees && data.attendees.length > 0 ? `Attendees:\n${data.attendees.map(a => `- ${a}`).join('\n')}\n\n` : ''}
      ${data.completedItems && data.completedItems.length > 0 ? `Completed Items:\n${data.completedItems.map(i => `- ✅ ${i}`).join('\n')}\n\n` : ''}
      ${data.newTodos && data.newTodos.length > 0 ? `New To-Dos:\n${data.newTodos.map(t => `- ${t.title} - Assigned to: ${t.assignee}, Due: ${t.dueDate}`).join('\n')}\n\n` : ''}
      ${data.issues && data.issues.length > 0 ? `Issues Discussed:\n${data.issues.map(i => `- ${i}`).join('\n')}\n\n` : ''}
      ${data.notes ? `Meeting Notes:\n${data.notes}\n\n` : ''}
      
      View full meeting details: ${data.meetingLink}
      
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
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const emailContent = template(data);
    
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

export default { sendEmail };