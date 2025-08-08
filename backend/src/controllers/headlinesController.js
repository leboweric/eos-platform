import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get headlines for an organization/team
// @route   GET /api/v1/organizations/:orgId/headlines
// @access  Private
export const getHeadlines = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { teamId, includeArchived } = req.query;
    const userId = req.user.id;

    // Build query conditions
    let conditions = ['h.organization_id = $1'];
    let params = [orgId];
    let paramIndex = 2;

    // Filter by archived status - by default, exclude archived
    if (!includeArchived || includeArchived === 'false') {
      conditions.push('(h.archived = false OR h.archived IS NULL)');
    }

    // Filter by team if provided - also include NULL team_id for backwards compatibility
    if (teamId) {
      conditions.push(`(h.team_id = $${paramIndex} OR h.team_id IS NULL)`);
      params.push(teamId);
      paramIndex++;
    }

    // Get headlines with creator information
    const result = await query(
      `SELECT 
        h.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        u.email as created_by_email,
        t.name as team_name
      FROM headlines h
      LEFT JOIN users u ON h.created_by = u.id
      LEFT JOIN teams t ON h.team_id = t.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY h.created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map(headline => ({
        ...headline,
        createdBy: headline.created_by_first_name && headline.created_by_last_name
          ? `${headline.created_by_first_name} ${headline.created_by_last_name}`
          : headline.created_by_email
      }))
    });
  } catch (error) {
    console.error('Error fetching headlines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch headlines'
    });
  }
};

// @desc    Create a new headline
// @route   POST /api/v1/organizations/:orgId/headlines
// @access  Private
export const createHeadline = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { type, text, teamId } = req.body;
    const userId = req.user.id;

    // Validate type
    if (!type || !['customer', 'employee'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid headline type. Must be "customer" or "employee"'
      });
    }

    // Validate text
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Headline text is required'
      });
    }

    const headlineId = uuidv4();
    const result = await query(
      `INSERT INTO headlines (
        id, organization_id, team_id, type, text, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [headlineId, orgId, teamId || null, type, text.trim(), userId]
    );

    // Fetch the complete headline with user information
    const headlineResult = await query(
      `SELECT 
        h.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        u.email as created_by_email
      FROM headlines h
      LEFT JOIN users u ON h.created_by = u.id
      WHERE h.id = $1`,
      [headlineId]
    );

    const headline = headlineResult.rows[0];
    res.status(201).json({
      success: true,
      data: {
        ...headline,
        createdBy: headline.created_by_first_name && headline.created_by_last_name
          ? `${headline.created_by_first_name} ${headline.created_by_last_name}`
          : headline.created_by_email
      }
    });
  } catch (error) {
    console.error('Error creating headline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create headline'
    });
  }
};

// @desc    Update a headline
// @route   PUT /api/v1/organizations/:orgId/headlines/:headlineId
// @access  Private
export const updateHeadline = async (req, res) => {
  try {
    const { orgId, headlineId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    // Check if headline exists and belongs to the organization
    const existingHeadline = await query(
      'SELECT * FROM headlines WHERE id = $1 AND organization_id = $2',
      [headlineId, orgId]
    );

    if (existingHeadline.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Headline not found'
      });
    }

    // Only allow the creator to update
    if (existingHeadline.rows[0].created_by !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own headlines'
      });
    }

    const result = await query(
      `UPDATE headlines 
       SET text = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3
       RETURNING *`,
      [text.trim(), headlineId, orgId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating headline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update headline'
    });
  }
};

// @desc    Delete a headline
// @route   DELETE /api/v1/organizations/:orgId/headlines/:headlineId
// @access  Private
export const deleteHeadline = async (req, res) => {
  try {
    const { orgId, headlineId } = req.params;
    const userId = req.user.id;

    // Check if headline exists and user has permission to delete
    const existingHeadline = await query(
      'SELECT * FROM headlines WHERE id = $1 AND organization_id = $2',
      [headlineId, orgId]
    );

    if (existingHeadline.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Headline not found'
      });
    }

    // Only allow the creator or admin to delete
    const userResult = await query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (existingHeadline.rows[0].created_by !== userId && userResult.rows[0]?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own headlines'
      });
    }

    await query(
      'DELETE FROM headlines WHERE id = $1 AND organization_id = $2',
      [headlineId, orgId]
    );

    res.json({
      success: true,
      data: { id: headlineId }
    });
  } catch (error) {
    console.error('Error deleting headline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete headline'
    });
  }
};

// @desc    Archive headlines (after meeting conclusion)
// @route   PUT /api/v1/organizations/:orgId/headlines/archive
// @access  Private
export const archiveHeadlines = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { teamId } = req.body;

    let conditions = ['organization_id = $1', '(archived = false OR archived IS NULL)'];
    let params = [orgId];

    if (teamId) {
      conditions.push('(team_id = $2 OR team_id IS NULL)');
      params.push(teamId);
    }

    const result = await query(
      `UPDATE headlines 
       SET archived = true, archived_at = NOW()
       WHERE ${conditions.join(' AND ')}
       RETURNING id`,
      params
    );

    res.json({
      success: true,
      data: {
        archivedCount: result.rows.length
      }
    });
  } catch (error) {
    console.error('Error archiving headlines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive headlines'
    });
  }
};

export default {
  getHeadlines,
  createHeadline,
  updateHeadline,
  deleteHeadline,
  archiveHeadlines
};