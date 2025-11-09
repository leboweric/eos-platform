import db from '../config/database.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { getUserTeamContext, isZeroUUID, getUserTeamScope } from '../utils/teamUtils.js';
import { autoSaveToDocuments } from '../utils/documentAutoSave.js';
import meetingSocketService from '../services/meetingSocketService.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to get team members
async function getTeamMembers(orgId) {
  const result = await db.query(
    `SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.role,
      u.first_name,
      u.last_name
     FROM users u
     WHERE u.organization_id = $1
     ORDER BY u.first_name, u.last_name`,
    [orgId]
  );
  
  return result.rows;
}

// Get all issues for an organization
export const getIssues = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { timeline, includeArchived, department_id } = req.query; // 'short_term' or 'long_term', includeArchived=true to show only archived
    const userId = req.user.id;
    
    // Get user's team context
    const userTeam = await getUserTeamContext(userId, orgId);
    // User team context debug - removed for production performance
    
    let query = `
      SELECT 
        i.id,
        i.organization_id,
        i.team_id,
        i.created_by_id,
        i.owner_id,
        i.title,
        i.description,
        i.priority_rank,
        i.manual_sort,
        i.status,
        i.timeline,
        i.resolution_notes,
        i.resolved_at,
        i.created_at,
        i.updated_at,
        i.archived,
        i.archived_at,
        i.vote_count,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        owner.first_name || ' ' || owner.last_name as owner_name,
        t.name as team_name,
        COUNT(DISTINCT ia.id) as attachment_count,
        EXISTS(SELECT 1 FROM issue_votes iv WHERE iv.issue_id = i.id AND iv.user_id = $2) as user_has_voted
      FROM issues i
      LEFT JOIN users creator ON i.created_by_id = creator.id
      LEFT JOIN users owner ON i.owner_id = owner.id
      LEFT JOIN teams t ON i.team_id = t.id
      LEFT JOIN issue_attachments ia ON ia.issue_id = i.id
      WHERE i.organization_id = $1 AND i.deleted_at IS NULL
    `;
    
    const params = [orgId, req.user.id];
    let paramCount = 3;
    
    // Filter by archived status
    if (includeArchived === 'true') {
      query += ` AND i.archived = TRUE`;
    } else {
      query += ` AND i.archived = FALSE`;
    }
    
    if (timeline) {
      query += ` AND i.timeline = $${paramCount}`;
      params.push(timeline);
      paramCount++;
    }
    
    // =====================================================================
    // MANDATORY TEAM ISOLATION
    // =====================================================================
    const teamScope = await getUserTeamScope(userId, orgId, 'i', department_id, paramCount); // Use 'i' as the alias for the issues table
    query += ` AND (${teamScope.query})`;
    if (teamScope.params.length > 0) {
      params.push(teamScope.params[0]); // CORRECTED LINE
      paramCount++;
    }
    // =====================================================================
    
    query += ` GROUP BY i.id, creator.first_name, creator.last_name, owner.first_name, owner.last_name, t.name
               ORDER BY 
                 i.manual_sort DESC NULLS LAST,
                 CASE WHEN i.manual_sort = true THEN i.priority_rank END ASC,
                 i.created_at DESC`;
    
    console.log('Issues query:', query);
    console.log('Issues query params:', params);
    
    const issues = await db.query(query, params);
    
    console.log(`Found ${issues.rows.length} issues for org ${orgId}`);
    
    // Get team members for the organization
    const teamMembers = await getTeamMembers(orgId);
    
    res.json({
      success: true,
      data: {
        issues: issues.rows.map(issue => ({
          ...issue,
          teamName: issue.team_name
        })),
        teamMembers
      }
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issues'
    });
  }
};

// Helper function to check if timeline column exists
async function checkTimelineColumn() {
  try {
    const result = await db.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'issues' AND column_name = 'timeline'`
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking timeline column:', error);
    return false;
  }
}

// Create a new issue
export const createIssue = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { title, description, ownerId, timeline, teamId, related_todo_id, related_headline_id, related_priority_id, priority_level, meeting_id } = req.body;
    const createdById = req.user.id;
    
    // Check if timeline column exists
    const hasTimelineColumn = await checkTimelineColumn();
    
    // Increment all existing priority ranks to make room at the top (priority_rank = 0)
    let incrementQuery = 'UPDATE issues SET priority_rank = priority_rank + 1 WHERE organization_id = $1 AND deleted_at IS NULL';
    let incrementParams = [orgId];
    
    if (hasTimelineColumn) {
      incrementQuery += ' AND timeline = $2';
      incrementParams.push(timeline || 'short_term');
    }
    
    await db.query(incrementQuery, incrementParams);
    
    // New issues always get priority_rank = 0 (top of the list)
    const nextRank = 0;
    
    // Build insert query based on available columns
    let columns = ['organization_id', 'team_id', 'created_by_id', 'owner_id', 'title', 'description', 'priority_rank', 'manual_sort', 'archived', 'status'];
    let values = [
      orgId,
      teamId || null,
      createdById,
      ownerId,
      title,
      description,
      nextRank,
      false,  // New issues are not manually sorted
      false,  // Ensure new issues are not archived
      'open'  // Default status for new issues
    ];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7', '$8', '$9', '$10'];
    
    if (hasTimelineColumn) {
      columns.push('timeline');
      values.push(timeline || 'short_term');
      placeholders.push(`$${values.length}`);
    }
    
    // Add related_todo_id if provided
    if (related_todo_id) {
      columns.push('related_todo_id');
      values.push(related_todo_id);
      placeholders.push(`$${values.length}`);
    }
    
    // Add priority_level if provided
    if (priority_level) {
      columns.push('priority_level');
      values.push(priority_level);
      placeholders.push(`$${values.length}`);
    }
    
    // Add related_headline_id if provided
    if (related_headline_id) {
      columns.push('related_headline_id');
      values.push(related_headline_id);
      placeholders.push(`$${values.length}`);
      
      // Also update the headline to mark it as having a related issue
      await db.query(
        'UPDATE headlines SET has_related_issue = true WHERE id = $1',
        [related_headline_id]
      );
    }
    
    // Add related_priority_id if provided
    if (related_priority_id) {
      columns.push('related_priority_id');
      values.push(related_priority_id);
      placeholders.push(`$${values.length}`);
    }
    
    // Add meeting_id if provided (for tracking issues created during meetings)
    if (meeting_id) {
      columns.push('meeting_id');
      values.push(meeting_id);
      placeholders.push(`$${values.length}`);
    }
    
    const result = await db.query(
      `INSERT INTO issues (${columns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );
    
    const newIssue = result.rows[0];
    
    // Fetch the full issue with owner details populated
    const enrichedResult = await db.query(
      `SELECT 
        i.*,
        owner.first_name || ' ' || owner.last_name as owner_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        t.name as team_name
      FROM issues i
      LEFT JOIN users owner ON i.owner_id = owner.id
      LEFT JOIN users creator ON i.created_by_id = creator.id
      LEFT JOIN teams t ON i.team_id = t.id
      WHERE i.id = $1`,
      [newIssue.id]
    );
    
    const enrichedIssue = enrichedResult.rows[0];

    // Broadcast to meeting participants if created during a meeting
    try {
      if (meeting_id && meetingSocketService) {
        await meetingSocketService.broadcastToMeetingById(meeting_id, 'issue-created', {
          issue: enrichedIssue,
          createdBy: req.user.first_name + ' ' + req.user.last_name
        });
      }
    } catch (broadcastError) {
      console.error('Failed to broadcast issue-created:', broadcastError.message);
    }

    res.status(201).json({
      success: true,
      data: enrichedIssue
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    
    // Check for unique constraint violation on related_todo_id
    if (error.code === '23505' && error.constraint === 'unique_todo_issue') {
      return res.status(409).json({
        success: false,
        message: 'An issue already exists for this todo'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create issue'
    });
  }
};

// Update an issue
export const updateIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    const { title, description, ownerId, status, timeline, resolutionNotes } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    if (title !== undefined) {
      updateFields.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (ownerId !== undefined) {
      updateFields.push(`owner_id = $${paramCount++}`);
      values.push(ownerId);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (timeline !== undefined) {
      updateFields.push(`timeline = $${paramCount++}`);
      values.push(timeline);
    }
    if (resolutionNotes !== undefined) {
      updateFields.push(`resolution_notes = $${paramCount++}`);
      values.push(resolutionNotes);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(issueId);
    values.push(orgId);
    
    const query = `
      UPDATE issues
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND organization_id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue'
    });
  }
};

// Move an issue to a different team
export const moveIssueToTeam = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    const { newTeamId, reason } = req.body;
    const userId = req.user.id;
    
    // Verify the issue exists and belongs to this organization
    const issueCheck = await db.query(
      'SELECT * FROM issues WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [issueId, orgId]
    );
    
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    const issue = issueCheck.rows[0];
    const oldTeamId = issue.team_id;
    
    // Get old and new team names for logging
    const teamsResult = await db.query(
      'SELECT id, name FROM teams WHERE id = ANY($1::uuid[]) AND organization_id = $2',
      [[oldTeamId, newTeamId], orgId]
    );
    
    const teams = teamsResult.rows.reduce((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
    
    // Update the issue's team
    const updateResult = await db.query(
      `UPDATE issues 
       SET team_id = $1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [newTeamId, issueId, orgId]
    );
    
    // Add a note to the issue's description about the transfer
    const transferNote = `\n\n---\n[Transferred from ${teams[oldTeamId] || 'Unknown Team'} to ${teams[newTeamId] || 'Unknown Team'} by user on ${new Date().toLocaleDateString()}]`;
    const transferReason = reason ? `\nReason: ${reason}` : '';
    
    await db.query(
      `UPDATE issues 
       SET description = description || $1
       WHERE id = $2`,
      [transferNote + transferReason, issueId]
    );
    
    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `Issue moved to ${teams[newTeamId] || 'new team'}`
    });
  } catch (error) {
    console.error('Error moving issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move issue'
    });
  }
};

// Delete an issue
export const deleteIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      'UPDATE issues SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id',
      [issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete issue'
    });
  }
};

// Update issue priority/order
export const updateIssuePriority = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { updates } = req.body; // Array of { id, priority_rank }
    
    // Use a transaction to update all priorities atomically
    await db.query('BEGIN');
    
    try {
      for (const update of updates) {
        await db.query(
          'UPDATE issues SET priority_rank = $1, manual_sort = true WHERE id = $2 AND organization_id = $3',
          [update.priority_rank, update.id, orgId]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Issue priorities updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating issue priorities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue priorities'
    });
  }
};

// Upload attachment
export const uploadAttachment = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    const uploadedBy = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { originalname, buffer, size, mimetype } = req.file;
    
    // Verify the issue exists and belongs to this organization
    const issueCheck = await db.query(
      'SELECT id FROM issues WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [issueId, orgId]
    );
    
    if (issueCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    // Get issue details for auto-save
    const issueDetails = await db.query(
      'SELECT title, team_id FROM issues WHERE id = $1',
      [issueId]
    );
    
    // Insert the attachment
    const attachmentId = uuidv4();
    const result = await db.query(
      `INSERT INTO issue_attachments 
       (id, issue_id, uploaded_by, file_name, file_data, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, issue_id, uploaded_by, file_name, file_size, mime_type, created_at`,
      [attachmentId, issueId, uploadedBy, originalname, buffer, size, mimetype]
    );
    
    // Auto-save to documents repository
    await autoSaveToDocuments({
      fileData: buffer,
      fileName: originalname,
      fileSize: size,
      mimeType: mimetype,
      orgId: orgId,
      uploadedBy: uploadedBy,
      sourceType: 'issue',
      sourceId: issueId,
      sourceTitle: issueDetails.rows[0]?.title || 'Untitled Issue',
      teamId: issueDetails.rows[0]?.team_id,
      visibility: issueDetails.rows[0]?.team_id ? 'department' : 'company'
    });
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment'
    });
  }
};

// Get attachments for an issue
export const getAttachments = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      `SELECT 
        ia.id,
        ia.file_name,
        ia.file_size,
        ia.mime_type,
        ia.created_at,
        u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM issue_attachments ia
       JOIN users u ON ia.uploaded_by = u.id
       JOIN issues i ON ia.issue_id = i.id
       WHERE ia.issue_id = $1 AND i.organization_id = $2
       ORDER BY ia.created_at DESC`,
      [issueId, orgId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attachments'
    });
  }
};

// Download attachment
export const downloadAttachment = async (req, res) => {
  try {
    const { orgId, issueId, attachmentId } = req.params;
    
    console.log(`[Attachment] Downloading attachment ${attachmentId} for issue ${issueId}`);
    
    const result = await db.query(
      `SELECT 
        ia.file_name,
        ia.file_data,
        ia.mime_type,
        ia.file_size
       FROM issue_attachments ia
       JOIN issues i ON ia.issue_id = i.id
       WHERE ia.id = $1 AND ia.issue_id = $2 AND i.organization_id = $3`,
      [attachmentId, issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      console.log(`[Attachment] Not found: ${attachmentId}`);
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }
    
    const { file_name, file_data, mime_type, file_size } = result.rows[0];
    
    console.log(`[Attachment] Found: ${file_name} (${file_size} bytes, type: ${mime_type})`);
    
    // Sanitize filename for Content-Disposition header
    // Remove or replace problematic characters
    const safeFilename = file_name
      .replace(/[^\w\s.-]/g, '_')  // Replace non-alphanumeric (except spaces, dots, hyphens) with underscore
      .replace(/\s+/g, '_');        // Replace spaces with underscores
    
    // Set headers for file download
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', file_data.length);
    
    // Send the file data
    res.send(file_data);
  } catch (error) {
    console.error('[Attachment] Download error:', error);
    console.error('[Attachment] Error details:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to download attachment',
      error: error.message
    });
  }
};

// Delete attachment
export const deleteAttachment = async (req, res) => {
  try {
    const { orgId, issueId, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Check if user can delete (either uploaded by them or they're an admin)
    const result = await db.query(
      `DELETE FROM issue_attachments ia
       USING issues i
       WHERE ia.id = $1 
       AND ia.issue_id = $2 
       AND i.id = ia.issue_id
       AND i.organization_id = $3
       AND (ia.uploaded_by = $4 OR $5 = 'admin')
       RETURNING ia.id`,
      [attachmentId, issueId, orgId, userId, req.user.role]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment'
    });
  }
};

// Archive a single issue
export const archiveIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      `UPDATE issues 
       SET archived = TRUE, 
           archived_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error archiving issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive issue'
    });
  }
};

// Archive all closed issues
export const archiveClosedIssues = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { timeline } = req.body; // Optional: archive only for specific timeline
    
    let query = `
      UPDATE issues 
      SET archived = TRUE, 
          archived_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE organization_id = $1 
      AND status = 'closed' 
      AND archived = FALSE
    `;
    
    const params = [orgId];
    
    if (timeline) {
      query += ` AND timeline = $2`;
      params.push(timeline);
    }
    
    query += ` RETURNING id`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      message: `Archived ${result.rows.length} closed issue(s)`,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error archiving closed issues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive closed issues'
    });
  }
};

// Unarchive an issue
export const unarchiveIssue = async (req, res) => {
  try {
    const { orgId, issueId } = req.params;
    
    const result = await db.query(
      `UPDATE issues 
       SET archived = FALSE, 
           archived_at = NULL,
           status = 'open', 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [issueId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Issue unarchived successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error unarchiving issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive issue'
    });
  }
};

// Vote for an issue
export const voteForIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.user.id;
    
    // Try to insert the vote
    const result = await db.query(
      `INSERT INTO issue_votes (issue_id, user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (issue_id, user_id) DO NOTHING
       RETURNING *`,
      [issueId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted for this issue'
      });
    }
    
    // Get updated issue with vote count
    const updatedIssue = await db.query(
      `SELECT vote_count FROM issues WHERE id = $1`,
      [issueId]
    );
    
    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        voteCount: updatedIssue.rows[0].vote_count
      }
    });
  } catch (error) {
    console.error('Error voting for issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to vote for issue'
    });
  }
};

// Remove vote from an issue
export const unvoteForIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const userId = req.user.id;
    
    // Delete the vote
    const result = await db.query(
      `DELETE FROM issue_votes 
       WHERE issue_id = $1 AND user_id = $2
       RETURNING *`,
      [issueId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'You have not voted for this issue'
      });
    }
    
    // Get updated issue with vote count
    const updatedIssue = await db.query(
      `SELECT vote_count FROM issues WHERE id = $1`,
      [issueId]
    );
    
    res.json({
      success: true,
      message: 'Vote removed successfully',
      data: {
        voteCount: updatedIssue.rows[0].vote_count
      }
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vote'
    });
  }
};

// Get user's votes for issues
export const getUserVotes = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT iv.issue_id 
       FROM issue_votes iv
       JOIN issues i ON iv.issue_id = i.id
       WHERE iv.user_id = $1 AND i.organization_id = $2`,
      [userId, orgId]
    );
    
    res.json({
      success: true,
      data: {
        votedIssueIds: result.rows.map(row => row.issue_id)
      }
    });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user votes'
    });
  }
};

// Get all updates for an issue
export const getIssueUpdates = async (req, res) => {
  try {
    const { issueId } = req.params;
    
    const result = await db.query(
      `SELECT 
        iu.id,
        iu.update_text,
        iu.created_at,
        iu.created_by,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM issue_updates iu
       JOIN users u ON iu.created_by = u.id
       WHERE iu.issue_id = $1
       ORDER BY iu.created_at DESC`,
      [issueId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching issue updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue updates'
    });
  }
};

// Add an update to an issue
export const addIssueUpdate = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { update_text } = req.body;
    const userId = req.user.id;
    
    if (!update_text || !update_text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Update text is required'
      });
    }
    
    const result = await db.query(
      `INSERT INTO issue_updates (issue_id, update_text, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, update_text, created_at`,
      [issueId, update_text.trim(), userId]
    );
    
    // Get the created update with user info
    const updateWithUser = await db.query(
      `SELECT 
        iu.id,
        iu.update_text,
        iu.created_at,
        iu.created_by,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM issue_updates iu
       JOIN users u ON iu.created_by = u.id
       WHERE iu.id = $1`,
      [result.rows[0].id]
    );
    
    res.json({
      success: true,
      message: 'Update added successfully',
      data: updateWithUser.rows[0]
    });
  } catch (error) {
    console.error('Error adding issue update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add issue update'
    });
  }
};

// Delete an issue update
export const deleteIssueUpdate = async (req, res) => {
  try {
    const { issueId, updateId } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the update or is an admin
    const updateCheck = await db.query(
      `SELECT created_by FROM issue_updates WHERE id = $1 AND issue_id = $2`,
      [updateId, issueId]
    );
    
    if (updateCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }
    
    const isOwner = updateCheck.rows[0].created_by === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own updates'
      });
    }
    
    await db.query(
      `DELETE FROM issue_updates WHERE id = $1 AND issue_id = $2`,
      [updateId, issueId]
    );
    
    res.json({
      success: true,
      message: 'Update deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting issue update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete issue update'
    });
  }
};

// Update issue order for drag-and-drop reordering
export const updateIssueOrder = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { issues } = req.body; // Array of { id, priority_rank }
    
    if (!issues || !Array.isArray(issues)) {
      return res.status(400).json({
        success: false,
        message: 'Issues array is required'
      });
    }
    
    // Start a transaction
    await db.query('BEGIN');
    
    try {
      // Update each issue's priority_rank
      for (const issue of issues) {
        await db.query(
          'UPDATE issues SET priority_rank = $1 WHERE id = $2 AND organization_id = $3',
          [issue.priority_rank, issue.id, orgId]
        );
      }
      
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Issue order updated successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating issue order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};