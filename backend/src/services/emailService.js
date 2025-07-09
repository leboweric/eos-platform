import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Email templates
const templates = {
  invitation: (data) => ({
    subject: `You're invited to join ${data.organizationName} on EOS Platform`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join ${data.organizationName}</h2>
        <p>Hi there,</p>
        <p>${data.invitedByName} has invited you to join ${data.organizationName} on EOS Platform as a ${data.role}.</p>
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
      You're invited to join ${data.organizationName} on EOS Platform
      
      ${data.invitedByName} has invited you to join ${data.organizationName} as a ${data.role}.
      
      Accept your invitation here: ${data.invitationLink}
      
      This invitation will expire in 7 days.
    `
  }),

  trialReminder: (data) => ({
    subject: `Your EOS Platform trial ends in ${data.daysRemaining} days`,
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
  })
};

// Send email function
export const sendEmail = async (to, templateName, data) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent to:', to);
    console.log('Email data:', { templateName, data });
    return;
  }

  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const emailContent = template(data);
    
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@eosplatform.com',
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