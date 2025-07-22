import { sendEmail } from '../services/emailService.js';

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
    
    // Send email
    await sendEmail({
      to: 'leboweric@gmail.com',
      subject: emailSubject,
      html: emailHtml,
      replyTo: user.email
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
    
    await sendEmail({
      to: user.email,
      subject: `Confirmation: ${emailSubject}`,
      html: confirmationHtml
    });
    
    res.json({
      success: true,
      message: 'Feedback submitted successfully. You will receive a confirmation email shortly.'
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback. Please try again later.'
    });
  }
};

export default {
  submitFeedback
};