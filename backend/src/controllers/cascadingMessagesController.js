import { query } from '../config/database.js';

// Create a cascading message
export const createCascadingMessage = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { message, recipientTeamIds, allTeams } = req.body;
    const userId = req.user.id;

    // Start a transaction
    await query('BEGIN');

    try {
      // Create the cascading message
      const messageResult = await query(
        `INSERT INTO cascading_messages (organization_id, from_team_id, message, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [orgId, teamId, message, userId]
      );

      const cascadingMessage = messageResult.rows[0];

      // Determine recipient teams
      let recipients = [];
      if (allTeams) {
        // Get all teams except the sending team
        const teamsResult = await query(
          `SELECT id FROM teams 
           WHERE organization_id = $1 AND id != $2`,
          [orgId, teamId]
        );
        recipients = teamsResult.rows.map(t => t.id);
      } else if (recipientTeamIds && recipientTeamIds.length > 0) {
        recipients = recipientTeamIds;
      }

      // Create recipient records
      if (recipients.length > 0) {
        const recipientValues = recipients.map((toTeamId, index) => 
          `($${index * 2 + 1}, $${index * 2 + 2})`
        ).join(', ');
        
        const recipientParams = recipients.flatMap(toTeamId => 
          [cascadingMessage.id, toTeamId]
        );

        await query(
          `INSERT INTO cascading_message_recipients (message_id, to_team_id)
           VALUES ${recipientValues}`,
          recipientParams
        );
      }

      await query('COMMIT');

      res.status(201).json({
        success: true,
        data: cascadingMessage
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating cascading message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create cascading message'
    });
  }
};

// Get cascading messages for a team's headlines
export const getCascadingMessages = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { startDate, endDate } = req.query;

    // Default to messages from the last 7 days if no date range specified
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT 
        cm.*,
        cmr.is_read,
        cmr.read_at,
        t.name as from_team_name,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM cascading_message_recipients cmr
       JOIN cascading_messages cm ON cmr.message_id = cm.id
       JOIN teams t ON cm.from_team_id = t.id
       JOIN users u ON cm.created_by = u.id
       WHERE cmr.to_team_id = $1
         AND cm.organization_id = $2
         AND cm.meeting_date BETWEEN $3 AND $4
       ORDER BY cm.created_at DESC`,
      [teamId, orgId, start, end]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching cascading messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cascading messages'
    });
  }
};

// Mark a cascading message as read
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { teamId } = req.body;
    const userId = req.user.id;

    await query(
      `UPDATE cascading_message_recipients
       SET is_read = true, read_at = CURRENT_TIMESTAMP, read_by = $1
       WHERE message_id = $2 AND to_team_id = $3`,
      [userId, messageId, teamId]
    );

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
};

// Get all teams for selection
export const getAvailableTeams = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;

    const result = await query(
      `SELECT id, name, is_leadership_team
       FROM teams
       WHERE organization_id = $1 AND id != $2
       ORDER BY is_leadership_team DESC, name ASC`,
      [orgId, teamId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available teams'
    });
  }
};