import sgMail from '@sendgrid/mail';

/**
 * Send notification when a new trial starts
 */
export const notifyNewTrial = async (userData) => {
  try {
    const { firstName, lastName, email, organizationName } = userData;
    
    // Admin notification email - hardcoded to ensure delivery
    const adminEmail = 'eric@profitbuildernetwork.com';
    
    const subject = `🎉 New Trial Signup: ${organizationName}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Trial Started!</h2>
        
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Organization Details:</h3>
          <p><strong>Company:</strong> ${organizationName}</p>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Next Steps:</strong></p>
          <ul>
            <li>They have 30 days to explore the platform</li>
            <li>Follow up in 3-5 days to offer assistance</li>
            <li>Check if they need help with data migration</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 14px;">
            View in Stripe Dashboard: 
            <a href="https://dashboard.stripe.com/customers?email=${encodeURIComponent(email)}">
              Search Customer
            </a>
          </p>
        </div>
      </div>
    `;
    
    const textContent = `
New Trial Started!

Organization: ${organizationName}
Name: ${firstName} ${lastName}
Email: ${email}
Signed up: ${new Date().toLocaleString()}

Next Steps:
- They have 30 days to explore the platform
- Follow up in 3-5 days to offer assistance
- Check if they need help with data migration
    `;
    
    // Send directly via SendGrid (bypass template system)
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Trial notification not sent.');
      console.log('Would have sent to:', adminEmail, 'Subject:', subject);
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: adminEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
      subject: subject,
      text: textContent,
      html: htmlContent
    };
    
    await sgMail.send(msg);
    console.log('✅ Admin notified of new trial:', organizationName, '- sent to:', adminEmail);
    
  } catch (error) {
    console.error('Failed to send trial notification:', error);
    // Don't throw - we don't want notification failure to break registration
  }
};

/**
 * Send notification when a trial converts to paid
 */
export const notifyTrialConverted = async (organizationName, planName, amount) => {
  try {
    // Admin notification email - hardcoded to ensure delivery
    const adminEmail = 'eric@profitbuildernetwork.com';
    
    const subject = `💰 Trial Converted: ${organizationName} → ${planName}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Trial Converted to Paid! 🎊</h2>
        
        <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0;">
            <strong>${organizationName}</strong> just upgraded to <strong>${planName}</strong>
          </p>
          <p style="font-size: 24px; color: #059669; margin: 10px 0;">
            $${amount}/month
          </p>
        </div>
        
        <p>Congratulations on the conversion! 🚀</p>
      </div>
    `;
    
    const textContent = `${organizationName} converted to ${planName} - $${amount}/month`;
    
    // Send directly via SendGrid (bypass template system)
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Conversion notification not sent.');
      console.log('Would have sent to:', adminEmail, 'Subject:', subject);
      return;
    }
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: adminEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
      subject: subject,
      text: textContent,
      html: htmlContent
    };
    
    await sgMail.send(msg);
    console.log('✅ Admin notified of trial conversion:', organizationName, '- sent to:', adminEmail);
    
  } catch (error) {
    console.error('Failed to send conversion notification:', error);
  }
};

export default {
  notifyNewTrial,
  notifyTrialConverted
};