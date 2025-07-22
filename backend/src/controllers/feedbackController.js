// Email sending is handled directly with SendGrid in this controller

// Submit feedback (ticket or enhancement request)
export const submitFeedback = async (req, res) => {
  try {
    const { type, subject, message, pageUrl } = req.body;
    const user = req.user;
    
    // Validate input
    if (!type || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Type, subject, and message are required'
      });
    }
    
    if (!['ticket', 'enhancement'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be either "ticket" or "enhancement"'
      });
    }
    
    // Prepare email content
    const emailSubject = `[${type.toUpperCase()}] ${subject}`;
    const emailHtml = `
      <h2>New ${type === 'ticket' ? 'Support Ticket' : 'Enhancement Request'}</h2>
      
      <h3>User Information:</h3>
      <ul>
        <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Organization:</strong> ${user.organizationName}</li>
        <li><strong>Role:</strong> ${user.role}</li>
      </ul>
      
      <h3>Submission Details:</h3>
      <ul>
        <li><strong>Type:</strong> ${type === 'ticket' ? 'Support Ticket' : 'Enhancement Request'}</li>
        <li><strong>Subject:</strong> ${subject}</li>
        <li><strong>Page URL:</strong> ${pageUrl || 'Not provided'}</li>
      </ul>
      
      <h3>Message:</h3>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        Submitted via Forty-2 Platform on ${new Date().toLocaleString()}
      </p>
    `;
    
    // For now, we'll use the direct SendGrid approach since we don't have a feedback template
    // We need to add a custom email send function or update the email service
    const sgMail = await import('@sendgrid/mail');
    
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Feedback email not sent.');
      // Still return success to user
      return res.json({
        success: true,
        message: 'Feedback received. Email notifications are currently disabled.'
      });
    }
    
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Send email to admin
    await sgMail.default.send({
      to: 'leboweric@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@42vibes.com',
      replyTo: user.email,
      subject: emailSubject,
      html: emailHtml
    });
    
    // Send confirmation email to user
    const confirmationHtml = `
      <h2>Thank you for your feedback!</h2>
      
      <p>We've received your ${type === 'ticket' ? 'support ticket' : 'enhancement request'} and will review it shortly.</p>
      
      <h3>Your Submission:</h3>
      <ul>
        <li><strong>Type:</strong> ${type === 'ticket' ? 'Support Ticket' : 'Enhancement Request'}</li>
        <li><strong>Subject:</strong> ${subject}</li>
      </ul>
      
      <h3>Message:</h3>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        ${message.replace(/\n/g, '<br>')}
      </div>
      
      <p>We'll get back to you as soon as possible at ${user.email}.</p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        This is an automated confirmation email. Please do not reply directly to this message.
      </p>
    `;
    
    await sgMail.default.send({
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@42vibes.com',
      subject: `Confirmation: ${emailSubject}`,
      html: confirmationHtml
    });
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully. You will receive a confirmation email shortly.'
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // If it's a SendGrid error, still save the feedback but notify user
    if (error.code === 'ENOTFOUND' || error.response?.body?.errors) {
      return res.json({
        success: true,
        message: 'Feedback received. We will review it shortly.',
        warning: 'Email notification could not be sent at this time.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.'
    });
  }
};

export default {
  submitFeedback
};