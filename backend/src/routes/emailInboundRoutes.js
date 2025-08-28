import express from 'express';
import multer from 'multer';
import { emailInboundService } from '../services/emailInboundService.js';
import { authenticateWebhook } from '../middleware/webhookAuth.js';

const router = express.Router();

// Multer configuration for handling form-data from SendGrid
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for attachments
});

/**
 * SendGrid Inbound Parse Webhook
 * Receives emails sent to issues@axplatform.app or org-specific addresses
 * 
 * SendGrid sends the following fields:
 * - headers: Full email headers
 * - to: Recipient email address
 * - from: Sender email address  
 * - subject: Email subject
 * - text: Plain text body
 * - html: HTML body (if available)
 * - envelope: SMTP envelope information
 * - attachments: Number of attachments
 * - attachment-info: JSON with attachment metadata
 * - attachment1, attachment2, etc: The actual attachment files
 */
router.post('/inbound-email', upload.any(), async (req, res) => {
  try {
    console.log('[EmailInbound] Received webhook from SendGrid');
    console.log('[EmailInbound] Headers:', req.headers);
    console.log('[EmailInbound] Body fields:', Object.keys(req.body));
    
    // Parse the email data from SendGrid
    const emailData = {
      to: req.body.to,
      from: req.body.from,
      subject: req.body.subject || 'No Subject',
      text: req.body.text || req.body.email || '',  // SendGrid sometimes sends as 'email' field
      html: req.body.html || '',
      headers: req.body.headers,
      envelope: req.body.envelope ? JSON.parse(req.body.envelope) : {},
      attachments: req.files || [],
      attachmentInfo: req.body['attachment-info'] ? JSON.parse(req.body['attachment-info']) : {}
    };

    // Extract sender email (format: "Name <email@domain.com>" or just "email@domain.com")
    const fromMatch = emailData.from.match(/<(.+)>/) || [null, emailData.from];
    const senderEmail = fromMatch[1].toLowerCase().trim();
    
    // Extract recipient email to determine organization/team
    const toMatch = emailData.to.match(/<(.+)>/) || [null, emailData.to];
    const recipientEmail = toMatch[1].toLowerCase().trim();
    
    console.log(`[EmailInbound] Processing email from ${senderEmail} to ${recipientEmail}`);
    console.log(`[EmailInbound] Subject: ${emailData.subject}`);
    console.log(`[EmailInbound] Body text length: ${emailData.text.length}`);
    
    // Process the email and create an issue
    const result = await emailInboundService.processInboundEmail({
      senderEmail,
      recipientEmail,
      subject: emailData.subject,
      body: emailData.text || emailData.html,
      html: emailData.html,
      attachments: emailData.attachments,
      headers: emailData.headers
    });

    if (result.success) {
      console.log(`[EmailInbound] Successfully created issue #${result.issue.id}`);
      res.status(200).json({ 
        success: true, 
        message: 'Issue created successfully',
        issueId: result.issue.id 
      });
    } else {
      console.error('[EmailInbound] Failed to process email:', result.error);
      // Still return 200 to SendGrid to prevent retries
      res.status(200).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('[EmailInbound] Webhook error:', error);
    // Return 200 to prevent SendGrid from retrying
    res.status(200).json({ 
      success: false, 
      error: 'Failed to process email' 
    });
  }
});

/**
 * Test endpoint for email parsing (development only)
 */
router.post('/test-inbound', async (req, res) => {
  try {
    const { senderEmail, subject, body, recipientEmail } = req.body;
    
    const result = await emailInboundService.processInboundEmail({
      senderEmail,
      recipientEmail: recipientEmail || 'issues@axplatform.app',
      subject,
      body,
      html: body,
      attachments: [],
      headers: {}
    });

    res.json(result);
  } catch (error) {
    console.error('[EmailInbound] Test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;