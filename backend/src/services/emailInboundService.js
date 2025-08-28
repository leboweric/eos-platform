import pool from '../config/database.js';
import { emailService } from './emailService.js';
import { v4 as uuidv4 } from 'uuid';

class EmailInboundService {
  /**
   * Process an inbound email and create an issue from it
   */
  async processInboundEmail({ senderEmail, recipientEmail, subject, body, html, attachments, headers }) {
    try {
      // 1. Verify sender is an authorized user
      const userResult = await pool.query(
        'SELECT id, first_name, last_name, organization_id FROM users WHERE email = $1',
        [senderEmail]
      );

      if (userResult.rows.length === 0) {
        console.log(`[EmailInbound] Sender ${senderEmail} not found in database`);
        // Send rejection email
        await this.sendRejectionEmail(senderEmail, 'Your email address is not registered in AXP.');
        return { 
          success: false, 
          error: 'Sender not authorized' 
        };
      }

      const user = userResult.rows[0];
      const userName = `${user.first_name} ${user.last_name}`.trim();
      console.log(`[EmailInbound] Found user: ${userName} (${user.id})`);

      // 2. Determine organization and team from recipient email
      // Format options: 
      // - issues@axplatform.app (uses sender's default org/team)
      // - issues-[org-id]@axplatform.app
      // - [org-subdomain]-issues@axplatform.app
      let organizationId = user.organization_id;
      let teamId = null; // Users don't have a default team, issues will be org-level

      // Parse recipient email for org/team routing
      const recipientParts = recipientEmail.split('@')[0];
      if (recipientParts.includes('-')) {
        const parts = recipientParts.split('-');
        
        // Check if it's an org ID format (UUID)
        if (parts[1] && parts[1].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          organizationId = parts[1];
          
          // Verify user has access to this org
          const accessCheck = await pool.query(
            'SELECT 1 FROM users WHERE id = $1 AND organization_id = $2',
            [user.id, organizationId]
          );
          
          if (accessCheck.rows.length === 0) {
            await this.sendRejectionEmail(senderEmail, 'You do not have access to this organization.');
            return { success: false, error: 'User does not have access to organization' };
          }
        }
        
        // Check if it's a subdomain format
        else if (parts[0] && parts[1] === 'issues') {
          const orgResult = await pool.query(
            'SELECT id FROM organizations WHERE subdomain = $1',
            [parts[0]]
          );
          
          if (orgResult.rows.length > 0) {
            organizationId = orgResult.rows[0].id;
          }
        }
      }

      // 3. Parse email content for metadata
      const parsedData = this.parseEmailContent(subject, body, html, attachments);

      // 4. Create the issue
      const issueQuery = `
        INSERT INTO issues (
          title,
          description,
          status,
          timeline,
          created_by,
          owner_id,
          organization_id,
          team_id,
          created_via,
          external_id,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
      `;

      const issueValues = [
        parsedData.title,
        parsedData.description,
        'open',
        parsedData.timeline || 'short_term',
        user.id,
        parsedData.assigneeId || user.id,
        organizationId,
        teamId || '00000000-0000-0000-0000-000000000000',
        'email',
        headers?.['message-id'] || null
      ];

      const issueResult = await pool.query(issueQuery, issueValues);
      const issue = issueResult.rows[0];

      console.log(`[EmailInbound] Created issue #${issue.id}: ${issue.title}`);

      // 5. Handle attachments if any
      if (attachments && attachments.length > 0) {
        await this.processAttachments(issue.id, attachments, user.id);
      }

      // 6. Send confirmation email
      await this.sendConfirmationEmail(senderEmail, issue, userName, attachments?.length || 0);

      return {
        success: true,
        issue
      };

    } catch (error) {
      console.error('[EmailInbound] Error processing email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse email content to extract issue metadata
   */
  parseEmailContent(subject, body, html, attachments) {
    // If we have HTML content with inline images, process them
    let processedBody = body;
    
    if (html && attachments && attachments.length > 0) {
      // Look for inline images (cid: references in HTML)
      const inlineImages = attachments.filter(att => 
        att.fieldname && att.fieldname.startsWith('attachment') && 
        html.includes(`cid:${att.originalname}`)
      );
      
      if (inlineImages.length > 0) {
        console.log(`[EmailInbound] Found ${inlineImages.length} inline images`);
        // For now, we'll note inline images in the description
        // In future, we could convert them to base64 or upload them
        processedBody = body + '\n\n[Note: This email contained inline images that have been attached to the issue]';
      }
    }
    
    const result = {
      title: subject,
      description: processedBody,
      timeline: 'short_term',
      assigneeId: null,
      priority: null
    };

    // Clean up the body
    result.description = result.description
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Parse priority indicators
    const priorityMatch = body.match(/priority:\s*(high|medium|low|urgent)/i) ||
                         subject.match(/\[(high|medium|low|urgent)\]/i) ||
                         subject.match(/urgent|asap|critical|important/i);
    
    if (priorityMatch) {
      const priority = priorityMatch[1] || 'high';
      result.priority = priority.toLowerCase();
      
      // Add priority to description if not already there
      if (!result.description.toLowerCase().includes('priority')) {
        result.description = `Priority: ${priority}\n\n${result.description}`;
      }
    }

    // Parse timeline indicators
    const timelineMatch = body.match(/timeline:\s*(short[_\s]?term|long[_\s]?term)/i) ||
                         body.match(/type:\s*(short[_\s]?term|long[_\s]?term)/i);
    
    if (timelineMatch) {
      result.timeline = timelineMatch[1].replace(/\s/g, '_').toLowerCase();
    }

    // Parse assignee (format: @username or assign: username)
    const assigneeMatch = body.match(/@(\w+(?:\.\w+)?)/i) ||
                         body.match(/assign(?:ed)?(?:\s+to)?:\s*(\w+(?:\.\w+)?)/i);
    
    if (assigneeMatch) {
      // We'd need to look up the user by username or partial name
      // For now, we'll leave it null and let it default to the sender
      result.assigneeUsername = assigneeMatch[1];
    }

    // Remove email signatures if present
    const signatureIndex = result.description.search(/^--\s*$/m);
    if (signatureIndex > 0) {
      result.description = result.description.substring(0, signatureIndex).trim();
    }

    // Remove common email footers
    result.description = result.description
      .replace(/Sent from my iPhone/gi, '')
      .replace(/Sent from my Android/gi, '')
      .replace(/Get Outlook for iOS/gi, '')
      .trim();

    return result;
  }

  /**
   * Process and store email attachments
   */
  async processAttachments(issueId, attachments, userId) {
    console.log(`[EmailInbound] Processing ${attachments.length} attachments for issue ${issueId}`);
    
    for (const attachment of attachments) {
      try {
        console.log(`[EmailInbound] Processing attachment: ${attachment.originalname} (${attachment.size} bytes)`);
        
        // Store attachment in PostgreSQL (following Railway's ephemeral filesystem requirement)
        const attachmentId = uuidv4();
        await pool.query(
          `INSERT INTO issue_attachments 
           (id, issue_id, uploaded_by, file_name, file_data, file_size, mime_type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            attachmentId,
            issueId,
            userId,
            attachment.originalname,
            attachment.buffer,
            attachment.size,
            attachment.mimetype || 'application/octet-stream'
          ]
        );
        
        console.log(`[EmailInbound] Stored attachment ${attachmentId} for issue ${issueId}`);
      } catch (error) {
        console.error(`[EmailInbound] Failed to store attachment ${attachment.originalname}:`, error);
        // Continue processing other attachments even if one fails
      }
    }
  }

  /**
   * Send confirmation email to sender
   */
  async sendConfirmationEmail(recipientEmail, issue, userName, attachmentCount = 0) {
    const attachmentText = attachmentCount > 0 
      ? `<p><strong>Attachments:</strong> ${attachmentCount} file${attachmentCount > 1 ? 's' : ''} attached</p>` 
      : '';
      
    const emailData = {
      to: recipientEmail,
      subject: `Issue #${issue.id} created: ${issue.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Issue Created Successfully</h2>
          <p>Hi ${userName},</p>
          <p>Your issue has been created in AXP:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${issue.title}</h3>
            <p><strong>Issue ID:</strong> #${issue.id}</p>
            <p><strong>Status:</strong> Open</p>
            <p><strong>Timeline:</strong> ${issue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}</p>
            ${attachmentText}
          </div>
          <p>You can view and manage this issue in AXP.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Pro tip:</strong> Include these keywords in your emails to automatically set properties:
          </p>
          <ul style="color: #6b7280; font-size: 14px;">
            <li>Priority: high, medium, low, urgent</li>
            <li>Timeline: short_term or long_term</li>
            <li>Assign: @username</li>
          </ul>
        </div>
      `,
      text: `
        Issue Created Successfully
        
        Hi ${userName},
        
        Your issue has been created in AXP:
        
        ${issue.title}
        Issue ID: #${issue.id}
        Status: Open
        Timeline: ${issue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
        
        You can view and manage this issue in AXP.
      `
    };

    try {
      await emailService.sendEmail(emailData);
      console.log(`[EmailInbound] Confirmation email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('[EmailInbound] Failed to send confirmation email:', error);
    }
  }

  /**
   * Send rejection email for unauthorized senders
   */
  async sendRejectionEmail(recipientEmail, reason) {
    const emailData = {
      to: recipientEmail,
      subject: 'Unable to create issue - AXP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Unable to Create Issue</h2>
          <p>We were unable to create an issue from your email.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you believe this is an error, please contact your AXP administrator.</p>
        </div>
      `,
      text: `
        Unable to Create Issue
        
        We were unable to create an issue from your email.
        Reason: ${reason}
        
        If you believe this is an error, please contact your AXP administrator.
      `
    };

    try {
      await emailService.sendEmail(emailData);
      console.log(`[EmailInbound] Rejection email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('[EmailInbound] Failed to send rejection email:', error);
    }
  }
}

export const emailInboundService = new EmailInboundService();