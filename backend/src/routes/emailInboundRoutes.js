import express from 'express';
import multer from 'multer';
import { simpleParser } from 'mailparser';
import { emailInboundService } from '../services/emailInboundService.js';
import { authenticateWebhook } from '../middleware/webhookAuth.js';

const router = express.Router();

// Multer configuration for handling form-data from SendGrid
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for attachments
});

/**
 * Filter out email signatures from text
 */
function filterSignature(text) {
  if (!text) return '';
  
  // Remove various signature patterns
  const signaturePatterns = [
    /^--_/m,  // Email boundaries
    /\[cid:.*?\]/gi,  // Inline image references
    /\[.*Material Handling.*\]/i,  // Company logos/names in brackets
    /^(Regards|Best|Thanks|Sincerely|Sent from|Get Outlook)/im,  // Common signature starters
    /^-{2,}/m,  // Signature separator lines (-- or more)
    /^_{2,}/m,  // Underscore separators
    /^From:\s/im,  // Forwarded message headers
    /^Sent:\s/im,
    /^To:\s/im,
    /^Subject:\s/im
  ];
  
  // Find the earliest signature indicator
  let earliestIndex = text.length;
  for (const pattern of signaturePatterns) {
    const match = text.search(pattern);
    if (match >= 0 && match < earliestIndex) {
      earliestIndex = match;
    }
  }
  
  // Also check for lines that look like contact info
  const contactInfoIndex = text.search(/^.*(Direct:|Main:|Phone:|Cell:|Mobile:|Email:|Web:|Website:|Fax:|Chief|Officer|Manager|Director)/im);
  if (contactInfoIndex >= 0 && contactInfoIndex < earliestIndex) {
    const lineStart = text.lastIndexOf('\n', contactInfoIndex);
    if (lineStart >= 0) {
      earliestIndex = lineStart;
    } else {
      earliestIndex = contactInfoIndex;
    }
  }
  
  // Cut the text at the earliest signature indicator
  if (earliestIndex < text.length) {
    text = text.substring(0, earliestIndex);
  }
  
  // Clean up any remaining artifacts
  text = text.replace(/\[cid:.*?\]/gi, '') // Remove any inline image references
             .replace(/\r\n/g, '\n') // Normalize line endings
             .replace(/\n{3,}/g, '\n\n') // Collapse multiple blank lines
             .trim();
  
  // If the result is empty or just whitespace, return a default message
  if (!text || text.length === 0) {
    return '[No text content - see attachments]';
  }
  
  return text;
}

/**
 * Extract clean text from raw email content
 * Handles multipart MIME messages, quoted-printable, and base64 encoding
 */
function extractCleanText(rawEmail) {
  if (!rawEmail) return '';
  
  // Check if the entire content is base64 encoded (no MIME structure)
  if (!rawEmail.includes('Content-Type:') && /^[A-Za-z0-9+/\r\n]+=*$/m.test(rawEmail)) {
    try {
      // Decode base64
      const decoded = Buffer.from(rawEmail.replace(/[\r\n]/g, ''), 'base64').toString('utf-8');
      // Apply signature filtering to decoded content
      return filterSignature(decoded);
    } catch (e) {
      console.log('[EmailInbound] Failed to decode base64:', e.message);
    }
  }
  
  // First, try to extract plain text section from multipart email
  const textMatch = rawEmail.match(/Content-Type: text\/plain[^]*?\r?\n\r?\n([^]*?)(?=--_|\r?\n--_|$)/i);
  if (textMatch && textMatch[1]) {
    let text = textMatch[1];
    
    // Check if this section is base64 encoded
    const transferEncodingMatch = rawEmail.match(/Content-Transfer-Encoding:\s*base64[^]*?\r?\n\r?\n([^]*?)(?=--_|\r?\n--_|$)/i);
    if (transferEncodingMatch) {
      try {
        text = Buffer.from(text.replace(/[\r\n]/g, ''), 'base64').toString('utf-8');
      } catch (e) {
        console.log('[EmailInbound] Failed to decode base64 section:', e.message);
      }
    }
    
    // Decode quoted-printable encoding
    text = text.replace(/=3D/g, '=')
              .replace(/=\r?\n/g, '') // Remove soft line breaks
              .replace(/=([0-9A-F]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    // Apply signature filtering
    return filterSignature(text);
  }
  
  // If no plain text section, return the raw email (fallback)
  return rawEmail.substring(0, 1000); // Limit to first 1000 chars as fallback
}

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
    console.log('[EmailInbound] Files received from multipart:', req.files ? req.files.length : 0);
    
    // Parse the email data from SendGrid
    const rawEmail = req.body.email || '';
    let cleanText = '';
    let parsedAttachments = [];
    
    // If we have raw MIME email, parse it for attachments
    if (rawEmail && rawEmail.includes('Content-Type:')) {
      try {
        console.log('[EmailInbound] Parsing MIME message for attachments...');
        const parsed = await simpleParser(rawEmail);
        
        // Extract clean text
        cleanText = parsed.text || parsed.html?.replace(/<[^>]*>/g, '') || '';
        cleanText = filterSignature(cleanText);
        
        // Extract attachments from MIME
        if (parsed.attachments && parsed.attachments.length > 0) {
          console.log(`[EmailInbound] Found ${parsed.attachments.length} attachments in MIME`);
          parsedAttachments = parsed.attachments.map(att => ({
            originalname: att.filename || 'unnamed',
            buffer: att.content,
            size: att.size,
            mimetype: att.contentType || 'application/octet-stream'
          }));
          
          parsedAttachments.forEach(att => {
            console.log(`[EmailInbound] MIME Attachment: ${att.originalname} (${att.size} bytes)`);
          });
        }
      } catch (parseError) {
        console.error('[EmailInbound] Failed to parse MIME:', parseError.message);
        cleanText = extractCleanText(rawEmail); // Fallback to old method
      }
    } else {
      cleanText = extractCleanText(rawEmail);
    }
    
    // Combine multipart files (if any) with MIME attachments
    const allAttachments = [...(req.files || []), ...parsedAttachments];
    console.log(`[EmailInbound] Total attachments to process: ${allAttachments.length}`);
    
    const emailData = {
      to: req.body.to,
      from: req.body.from,
      subject: req.body.subject || 'No Subject',
      text: req.body.text || cleanText || '',
      html: req.body.html || '',
      headers: req.body.headers,
      envelope: req.body.envelope ? JSON.parse(req.body.envelope) : {},
      attachments: allAttachments,
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
    console.log(`[EmailInbound] Clean text preview: ${emailData.text.substring(0, 100)}...`);
    
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