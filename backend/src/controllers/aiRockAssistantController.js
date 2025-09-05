import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { isZeroUUID } from '../utils/teamUtils.js';
import {
  analyzeRockSMART,
  generateMilestones,
  checkRockAlignment,
  generateSmartRock,
  validateConfiguration
} from '../services/openaiService.js';

/**
 * Check if AI service is configured
 */
export const checkConfiguration = async (req, res) => {
  try {
    const result = await validateConfiguration();
    
    if (result.configured) {
      res.json({
        configured: true,
        message: result.message
      });
    } else {
      res.status(503).json({
        configured: false,
        error: result.error,
        message: 'AI features are not available. Please configure OpenAI API key.'
      });
    }
  } catch (error) {
    console.error('Configuration check error:', error);
    res.status(500).json({
      error: 'Failed to check AI configuration'
    });
  }
};

/**
 * Analyze a Rock for SMART criteria
 */
export const analyzeRock = async (req, res) => {
  const { title, description, saveAnalysis } = req.body;
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    // Validate input
    if (!title) {
      return res.status(400).json({
        error: 'Rock title is required'
      });
    }

    // Call OpenAI service
    const analysis = await analyzeRockSMART(title, description);

    if (!analysis.success) {
      return res.status(500).json({
        error: analysis.error || 'Failed to analyze Rock'
      });
    }

    // Save to database if requested
    if (saveAnalysis) {
      const suggestionId = uuidv4();
      await query(
        `INSERT INTO rock_suggestions (
          id, organization_id, suggestion_type, original_text, 
          suggested_text, reasoning, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          suggestionId,
          orgId,
          'smart_improvement',
          JSON.stringify({ title, description }),
          JSON.stringify(analysis.data.suggestedRewrite),
          analysis.data.keyIssues?.join('\n') || '',
          analysis.data,
          userId
        ]
      );

      analysis.data.suggestionId = suggestionId;
    }

    res.json({
      success: true,
      analysis: analysis.data
    });
  } catch (error) {
    console.error('Rock analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze Rock'
    });
  }
};

/**
 * Generate milestones for a Rock
 */
export const suggestMilestones = async (req, res) => {
  const { title, description, dueDate, startDate } = req.body;
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    // Validate input
    if (!title || !dueDate) {
      return res.status(400).json({
        error: 'Rock title and due date are required'
      });
    }

    // Call OpenAI service
    const result = await generateMilestones(
      title,
      description,
      dueDate,
      startDate ? new Date(startDate) : new Date()
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate milestones'
      });
    }

    // Save suggestion to database
    const suggestionId = uuidv4();
    await query(
      `INSERT INTO rock_suggestions (
        id, organization_id, suggestion_type, original_text, 
        suggested_text, reasoning, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        suggestionId,
        orgId,
        'milestone',
        JSON.stringify({ title, description }),
        JSON.stringify(result.data.milestones),
        result.data.reasoning || '',
        result.data,
        userId
      ]
    );

    res.json({
      success: true,
      suggestionId,
      milestones: result.data.milestones,
      reasoning: result.data.reasoning
    });
  } catch (error) {
    console.error('Milestone generation error:', error);
    res.status(500).json({
      error: 'Failed to generate milestones'
    });
  }
};

/**
 * Check alignment with Company Rocks
 */
export const checkAlignment = async (req, res) => {
  const { departmentRock } = req.body;
  const { orgId, teamId } = req.params;
  const userId = req.user.id;

  try {
    // Validate input
    if (!departmentRock || !departmentRock.title) {
      return res.status(400).json({
        error: 'Department Rock information is required'
      });
    }

    // Get current quarter's Company Rocks
    const currentQuarter = `Q${Math.floor((new Date().getMonth() + 3) / 3)}`;
    const currentYear = new Date().getFullYear();

    const companyRocksResult = await query(
      `SELECT qp.id, qp.title, qp.description 
       FROM quarterly_priorities qp
       LEFT JOIN teams t ON qp.team_id = t.id
       WHERE qp.organization_id = $1 
         AND qp.quarter = $2 
         AND qp.year = $3 
         AND (qp.team_id IS NULL OR t.is_leadership_team = true)
         AND qp.deleted_at IS NULL
       ORDER BY qp.created_at`,
      [orgId, currentQuarter, currentYear]
    );

    if (companyRocksResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No Company Rocks found for the current quarter'
      });
    }

    // Call OpenAI service
    const result = await checkRockAlignment(
      departmentRock,
      companyRocksResult.rows
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to check alignment'
      });
    }

    // Save analysis to database
    const suggestionId = uuidv4();
    await query(
      `INSERT INTO rock_suggestions (
        id, organization_id, suggestion_type, original_text, 
        suggested_text, reasoning, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        suggestionId,
        orgId,
        'alignment',
        JSON.stringify(departmentRock),
        JSON.stringify(result.data.suggestedAdjustments),
        result.data.alignmentExplanation || '',
        result.data,
        userId
      ]
    );

    // Add Company Rock details to response
    const alignedRocks = result.data.alignedWithRocks?.map(index => 
      companyRocksResult.rows[index - 1] // Convert from 1-based to 0-based index
    ).filter(Boolean) || [];

    res.json({
      success: true,
      suggestionId,
      alignment: {
        ...result.data,
        companyRocks: companyRocksResult.rows,
        alignedRocks
      }
    });
  } catch (error) {
    console.error('Alignment check error:', error);
    res.status(500).json({
      error: 'Failed to check alignment'
    });
  }
};

/**
 * Generate a complete SMART Rock from an idea
 */
export const generateRock = async (req, res) => {
  const { idea, quarter, year, teamName, ownerName } = req.body;
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    // Validate input
    if (!idea) {
      return res.status(400).json({
        error: 'Rock idea is required'
      });
    }

    // Call OpenAI service
    const result = await generateSmartRock(idea, {
      quarter,
      year,
      teamName,
      ownerName
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to generate Rock'
      });
    }

    // Save to database
    const suggestionId = uuidv4();
    await query(
      `INSERT INTO rock_suggestions (
        id, organization_id, suggestion_type, original_text, 
        suggested_text, reasoning, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        suggestionId,
        orgId,
        'general',
        idea,
        JSON.stringify(result.data),
        'AI-generated SMART Rock from idea',
        result.data,
        userId
      ]
    );

    res.json({
      success: true,
      suggestionId,
      rock: result.data
    });
  } catch (error) {
    console.error('Rock generation error:', error);
    res.status(500).json({
      error: 'Failed to generate Rock'
    });
  }
};

/**
 * Mark a suggestion as applied
 */
export const applySuggestion = async (req, res) => {
  const { suggestionId } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      `UPDATE rock_suggestions 
       SET applied = true, 
           applied_at = CURRENT_TIMESTAMP, 
           applied_by = $1
       WHERE id = $2
       RETURNING *`,
      [userId, suggestionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Suggestion not found'
      });
    }

    res.json({
      success: true,
      suggestion: result.rows[0]
    });
  } catch (error) {
    console.error('Apply suggestion error:', error);
    res.status(500).json({
      error: 'Failed to mark suggestion as applied'
    });
  }
};

/**
 * Get suggestion history for an organization
 */
export const getSuggestionHistory = async (req, res) => {
  const { orgId } = req.params;
  const { limit = 50, offset = 0, type, applied } = req.query;

  try {
    let whereClause = 'WHERE rs.organization_id = $1';
    const queryParams = [orgId];
    let paramCount = 1;

    if (type) {
      paramCount++;
      whereClause += ` AND rs.suggestion_type = $${paramCount}`;
      queryParams.push(type);
    }

    if (applied !== undefined) {
      paramCount++;
      whereClause += ` AND rs.applied = $${paramCount}`;
      queryParams.push(applied === 'true');
    }

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const result = await query(
      `SELECT 
        rs.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        au.first_name || ' ' || au.last_name as applied_by_name
       FROM rock_suggestions rs
       LEFT JOIN users u ON rs.created_by = u.id
       LEFT JOIN users au ON rs.applied_by = au.id
       ${whereClause}
       ORDER BY rs.created_at DESC
       LIMIT $${paramCount - 1} OFFSET $${paramCount}`,
      queryParams
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM rock_suggestions rs ${whereClause}`,
      queryParams.slice(0, -2)
    );

    res.json({
      success: true,
      suggestions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get suggestion history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve suggestion history'
    });
  }
};