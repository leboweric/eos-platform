import express from 'express';
import multer from 'multer';
import { simpleParser } from 'mailparser';
import { emailInboundService } from '../services/emailInboundService.js';
import { authenticateWebhook } from '../middleware/webhookAuth.js';

const router = express.Router();

// Multer configuration for handling form-data from SendGrid
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 25 * 1024 * 1024,     // 25MB limit for attachments
    fieldSize: 25 * 1024 * 1024,    // 25MB limit for field values (handles large email content)
    fields: 50                       // Max number of fields
  }
});

/**
 * Extract the actual message content from email text
 * Handles forwarded emails, reply chains, and signature blocks
 * Returns the original/forwarded message content, not the forwarder's signature
 */
function filterSignature(text) {
  if (!text) return '';
  
  // First, clean up common artifacts
  text = text.replace(/\[cid:.*?\]/gi, '') // Remove inline image references
             .replace(/\r\n/g, '\n') // Normalize line endings
             .replace(/\n{3,}/g, '\n\n'); // Collapse multiple blank lines
  
  console.log('[EmailInbound] Raw text to filter:', text.substring(0, 500));
  
  // Check if this is a forwarded email - look for forwarded message markers
  // If found, extract the content AFTER the forward marker
  const forwardPatterns = [
    /From:\s+[^\n]+\n(?:Date|Sent):\s+[^\n]+\n(?:To:\s+[^\n]+\n)?(?:Cc:\s+[^\n]+\n)?Subject:\s+[^\n]+\n/i,
    /-+\s*Original Message\s*-+/i,
    /-+\s*Forwarded message\s*-+/i,
  ];
  
  let messageContent = text;
  
  for (const pattern of forwardPatterns) {
    const match = text.match(pattern);
    if (match) {
      // Found a forward marker - extract content after it
      const forwardIndex = text.indexOf(match[0]);
      const afterForward = text.substring(forwardIndex + match[0].length).trim();
      
      if (afterForward.length > 20) {
        console.log('[EmailInbound] Found forwarded content, extracting message after forward header');
        messageContent = afterForward;
        break;
      }
    }
  }
  
  // Now clean up the message content - remove signatures from the END
  const lines = messageContent.split('\n');
  let contentEndIndex = lines.length;
  
  // Work backwards to find where actual content ends
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Skip empty lines at the end
    if (!line) {
      contentEndIndex = i;
      continue;
    }
    
    // Check if this line looks like signature/contact info
    const isSignatureLine = 
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line) ||  // Any phone number in line
      /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(line) ||  // Email only on line
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(line) && line.length < 50 ||  // Short line with email
      /^(Web|Website|Fax|Direct|Main|Phone|Cell|Mobile|Email):/i.test(line) ||  // Contact labels at start
      /\s+-\s+(Direct|Office|Fax|Main|Cell|Mobile)$/i.test(line) ||  // Labels at end like "952-224-5727 - Direct"
      /^(www\.|http)/i.test(line) ||  // URLs
      /^\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Jackson)/i.test(line) ||  // Address
      /^[A-Z][a-z]+,\s*[A-Z]{2}\s+\d{5}/i.test(line) ||  // City, State ZIP
      /Family Owned|Authorized|Dealer/i.test(line) ||  // Company taglines
      /^[A-Z][A-Z]+\s+[A-Z][A-Z]+$/.test(line) && line.length < 40 ||  // ALL CAPS name (2+ chars each word)
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(line) && line.length < 30 ||  // Title Case name only
      /Accounts Receivable|Accounts Payable|Credit|Manager|Director|Officer|Chief|President|VP|Vice President/i.test(line);  // Job titles
    
    if (isSignatureLine) {
      contentEndIndex = i;
    } else {
      // Found actual content, stop looking
      break;
    }
  }
  
  // Extract just the content portion
  if (contentEndIndex < lines.length) {
    messageContent = lines.slice(0, contentEndIndex).join('\n');
  }
  
  // Final cleanup
  messageContent = messageContent.trim();
  
  console.log('[EmailInbound] Filtered message content:', messageContent.substring(0, 200));
  
  return messageContent || '';
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
        
        // Extract attachments from MIME (excluding inline images from signatures)
        if (parsed.attachments && parsed.attachments.length > 0) {
          console.log(`[EmailInbound] Found ${parsed.attachments.length} attachments in MIME`);
          
          // Filter out inline images (typically from email signatures)
          // Keep only attachments that are NOT inline/embedded
          const realAttachments = parsed.attachments.filter(att => {
            // Check if it's an inline image (has cid or is marked as inline)
            const isInline = att.contentDisposition === 'inline' || 
                           att.cid || 
                           (att.headers && att.headers['content-id']);
            
            if (isInline) {
              console.log(`[EmailInbound] Filtering out inline image: ${att.filename || 'unnamed'}`);
              return false;
            }
            return true;
          });
          
          console.log(`[EmailInbound] Keeping ${realAttachments.length} real attachments (filtered ${parsed.attachments.length - realAttachments.length} inline images)`);
          
          parsedAttachments = realAttachments.map(att => ({
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
    console.log(`[EmailInbound] req.body.text length: ${(req.body.text || '').length}`);
    console.log(`[EmailInbound] cleanText length: ${cleanText.length}`);
    console.log(`[EmailInbound] Final text length: ${emailData.text.length}`);
    console.log(`[EmailInbound] HTML length: ${emailData.html.length}`);
    console.log(`[EmailInbound] Text preview: ${emailData.text.substring(0, 200)}...`);
    
    // Determine the best body content to use
    let bodyContent = emailData.text;
    
    // If text is empty or very short, try to extract from HTML
    if ((!bodyContent || bodyContent.length < 10) && emailData.html) {
      console.log('[EmailInbound] Text body empty/short, extracting from HTML');
      // Strip HTML tags and decode entities
      bodyContent = emailData.html
        .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
        .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
      console.log(`[EmailInbound] Extracted ${bodyContent.length} chars from HTML`);
    }
    
    // Process the email and create an issue
    const result = await emailInboundService.processInboundEmail({
      senderEmail,
      recipientEmail,
      subject: emailData.subject,
      body: bodyContent || '',
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