import pool from '../config/database.js';
import sgMail from '@sendgrid/mail';
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

      // 2. Determine organization and team
      let organizationId = user.organization_id;
      
      // Get all teams the user is a member of
      const userTeamsResult = await pool.query(`
        SELECT t.id, t.name, t.is_leadership_team 
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.organization_id = $2
        ORDER BY t.is_leadership_team DESC, t.name ASC
      `, [user.id, organizationId]);
      
      const userTeams = userTeamsResult.rows;
      
      // Parse team tag from subject line [TeamName]
      const teamTagResult = this.parseTeamTag(subject, userTeams);
      
      let teamId = null;
      let teamName = 'Organization';
      let teamTagNotFound = null;
      let cleanSubject = subject;
      
      if (teamTagResult.tagFound) {
        if (teamTagResult.matchedTeam) {
          // Team tag found and matched
          teamId = teamTagResult.matchedTeam.id;
          teamName = teamTagResult.matchedTeam.name;
          cleanSubject = teamTagResult.cleanSubject;
          console.log(`[EmailInbound] Team tag [${teamTagResult.tagValue}] matched to: ${teamName}`);
        } else {
          // Team tag found but no match - use default and note the issue
          teamTagNotFound = teamTagResult.tagValue;
          cleanSubject = teamTagResult.cleanSubject;
          console.log(`[EmailInbound] Team tag [${teamTagResult.tagValue}] not found in user's teams`);
          
          // Fall back to default team
          const defaultTeam = userTeams.find(t => t.is_leadership_team) || userTeams[0];
          if (defaultTeam) {
            teamId = defaultTeam.id;
            teamName = defaultTeam.name;
          }
        }
      } else {
        // No team tag - use default team (prioritize Leadership Team)
        const defaultTeam = userTeams.find(t => t.is_leadership_team) || userTeams[0];
        if (defaultTeam) {
          teamId = defaultTeam.id;
          teamName = defaultTeam.name;
        }
        console.log(`[EmailInbound] No team tag found, using default: ${teamName}`);
      }

      // Parse recipient email for org/team routing (legacy support)
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

      // 3. Parse email content for metadata (use clean subject without team tag)
      const parsedData = this.parseEmailContent(cleanSubject, body, html, attachments);

      // 4. Create the issue
      const issueQuery = `
        INSERT INTO issues (
          title,
          description,
          status,
          timeline,
          created_by_id,
          owner_id,
          organization_id,
          team_id,
          priority_rank,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;

      const issueValues = [
        parsedData.title,
        parsedData.description,
        'open',
        parsedData.timeline || 'short_term',
        user.id, // created_by_id
        parsedData.assigneeId || user.id, // owner_id
        organizationId,
        teamId, // will be user's team
        999999 // Default priority - issues aren't prioritized until voted on in EOS
      ];

      const issueResult = await pool.query(issueQuery, issueValues);
      const issue = issueResult.rows[0];

      console.log(`[EmailInbound] Created issue #${issue.id}: ${issue.title}`);

      // 5. Handle attachments if any
      if (attachments && attachments.length > 0) {
        await this.processAttachments(issue.id, attachments, user.id);
      }

      // 6. Send confirmation email (include team tag info and available teams)
      await this.sendConfirmationEmail(
        senderEmail, 
        issue, 
        userName, 
        attachments?.length || 0, 
        teamName,
        userTeams,
        teamTagNotFound
      );

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
   * Parse team tag from subject line
   * Supports formats like: [Leadership] Issue title, [Ops] Issue title
   * Returns: { tagFound, tagValue, matchedTeam, cleanSubject }
   */
  parseTeamTag(subject, userTeams) {
    const result = {
      tagFound: false,
      tagValue: null,
      matchedTeam: null,
      cleanSubject: subject
    };

    // Look for [TeamName] pattern at the start of subject
    const tagMatch = subject.match(/^\s*\[([^\]]+)\]\s*/i);
    
    if (!tagMatch) {
      return result;
    }

    result.tagFound = true;
    result.tagValue = tagMatch[1].trim();
    result.cleanSubject = subject.replace(tagMatch[0], '').trim();

    if (!userTeams || userTeams.length === 0) {
      return result;
    }

    const tagLower = result.tagValue.toLowerCase();

    // Try exact match first (case-insensitive)
    let matchedTeam = userTeams.find(t => 
      t.name.toLowerCase() === tagLower
    );

    // Try partial match (tag is contained in team name or vice versa)
    if (!matchedTeam) {
      matchedTeam = userTeams.find(t => {
        const teamNameLower = t.name.toLowerCase();
        return teamNameLower.includes(tagLower) || tagLower.includes(teamNameLower);
      });
    }

    // Try word-based match (any word in tag matches any word in team name)
    if (!matchedTeam) {
      const tagWords = tagLower.split(/\s+/);
      matchedTeam = userTeams.find(t => {
        const teamWords = t.name.toLowerCase().split(/\s+/);
        return tagWords.some(tw => teamWords.some(tnw => 
          tnw.includes(tw) || tw.includes(tnw)
        ));
      });
    }

    // Try abbreviation match (e.g., "LT" for "Leadership Team", "Ops" for "Operations")
    if (!matchedTeam) {
      matchedTeam = userTeams.find(t => {
        const teamNameLower = t.name.toLowerCase();
        // Check if tag could be an abbreviation
        const initials = t.name.split(/\s+/).map(w => w[0]).join('').toLowerCase();
        return initials === tagLower || 
               teamNameLower.startsWith(tagLower) ||
               // Common abbreviations
               (tagLower === 'ops' && teamNameLower.includes('operation')) ||
               (tagLower === 'lt' && teamNameLower.includes('leadership')) ||
               (tagLower === 'hr' && teamNameLower.includes('human resource'));
      });
    }

    if (matchedTeam) {
      result.matchedTeam = matchedTeam;
    }

    return result;
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
  async sendConfirmationEmail(recipientEmail, issue, userName, attachmentCount = 0, teamName = 'Organization', userTeams = [], teamTagNotFound = null) {
    const attachmentText = attachmentCount > 0 
      ? `<p><strong>Attachments:</strong> ${attachmentCount} file${attachmentCount > 1 ? 's' : ''} attached</p>` 
      : '';
    
    // Truncate description for email (show first 200 chars)
    const descriptionPreview = issue.description && issue.description.length > 200 
      ? issue.description.substring(0, 200) + '...' 
      : issue.description || 'No description provided';
    
    // Build team tag not found warning
    const teamTagWarning = teamTagNotFound 
      ? `<p style="color: #dc2626; background: #fef2f2; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
          <strong>Note:</strong> Team tag [${teamTagNotFound}] was not found in your teams. 
          The issue was added to <strong>${teamName}</strong> instead.
        </p>`
      : '';
    
    // Build available teams list
    const teamsListHtml = userTeams.length > 0
      ? `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
          <strong>Your available team tags:</strong><br>
          ${userTeams.map(t => `[${t.name}]`).join(', ')}
        </p>`
      : '';
    
    const teamsListText = userTeams.length > 0
      ? `Your available team tags: ${userTeams.map(t => `[${t.name}]`).join(', ')}`
      : '';
      
    const emailData = {
      to: recipientEmail,
      subject: `Issue created: ${issue.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Issue Created Successfully</h2>
          <p>Hi ${userName},</p>
          ${teamTagWarning}
          <p>Your issue has been created in AXP and added to the <strong>${teamName}</strong> issues list.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Subject:</strong> ${issue.title}</p>
            <p><strong>Description:</strong> ${descriptionPreview}</p>
            <p><strong>Team:</strong> ${teamName}</p>
            <p><strong>Timeline:</strong> ${issue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}</p>
            ${attachmentText}
          </div>
          <p>You can view and manage this issue in AXP.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Pro tip:</strong> Include a team tag in your subject line to route issues to specific teams:
          </p>
          <p style="color: #6b7280; font-size: 14px; font-style: italic;">
            Example: [Leadership] Server needs attention
          </p>
          ${teamsListHtml}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Other keywords:</strong>
          </p>
          <ul style="color: #6b7280; font-size: 14px;">
            <li>Timeline: short_term or long_term</li>
            <li>Assign: @username</li>
          </ul>
        </div>
      `,
      text: `
        Issue Created Successfully
        
        Hi ${userName},
        ${teamTagNotFound ? `\nNote: Team tag [${teamTagNotFound}] was not found. Issue added to ${teamName} instead.\n` : ''}
        Your issue has been created in AXP and added to the ${teamName} issues list.
        
        Subject: ${issue.title}
        Description: ${descriptionPreview}
        Team: ${teamName}
        Timeline: ${issue.timeline === 'short_term' ? 'Short Term' : 'Long Term'}
        ${attachmentCount > 0 ? `Attachments: ${attachmentCount} file${attachmentCount > 1 ? 's' : ''} attached` : ''}
        
        You can view and manage this issue in AXP.
        
        ---
        Pro tip: Include a team tag in your subject line to route issues to specific teams.
        Example: [Leadership] Server needs attention
        
        ${teamsListText}
        
        Other keywords:
        - Timeline: short_term or long_term
        - Assign: @username
      `
    };

    try {
      // Set API key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html
      };
      
      await sgMail.send(msg);
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
      // Set API key
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to: recipientEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@axplatform.app',
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html
      };
      
      await sgMail.send(msg);
      console.log(`[EmailInbound] Rejection email sent to ${recipientEmail}`);
    } catch (error) {
      console.error('[EmailInbound] Failed to send rejection email:', error);
    }
  }
}

// Named export to match the import in emailInboundRoutes.js
export const emailInboundService = new EmailInboundService();
