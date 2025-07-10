import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get all skills for an organization
// @route   GET /api/v1/organizations/:orgId/skills
// @access  Private
export const getOrganizationSkills = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { category } = req.query;

    // Verify access
    if (req.user.organizationId !== orgId && !req.user.isImpersonating) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    let skillsQuery = 'SELECT * FROM skills WHERE organization_id = $1';
    const queryParams = [orgId];

    if (category) {
      skillsQuery += ' AND category = $2';
      queryParams.push(category);
    }

    skillsQuery += ' ORDER BY category, name';

    const result = await query(skillsQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    });
  }
};

// @desc    Create a new skill
// @route   POST /api/v1/organizations/:orgId/skills
// @access  Private (Admin or Manager)
export const createSkill = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, category, description } = req.body;
    const userId = req.user.id;

    // Verify admin or manager role
    if (!['admin', 'manager'].includes(req.user.role) && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only admins, managers, or consultants can create skills'
      });
    }

    const skillId = uuidv4();
    const result = await query(
      `INSERT INTO skills (id, organization_id, name, category, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [skillId, orgId, name, category, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.constraint === 'unique_org_skill') {
      return res.status(400).json({
        success: false,
        error: 'A skill with this name already exists in your organization'
      });
    }
    
    console.error('Error creating skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create skill'
    });
  }
};

// @desc    Update a skill
// @route   PUT /api/v1/organizations/:orgId/skills/:skillId
// @access  Private (Admin or Manager)
export const updateSkill = async (req, res) => {
  try {
    const { orgId, skillId } = req.params;
    const { name, category, description } = req.body;

    // Verify admin or manager role
    if (!['admin', 'manager'].includes(req.user.role) && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only admins, managers, or consultants can update skills'
      });
    }

    const result = await query(
      `UPDATE skills 
       SET name = $1, category = $2, description = $3
       WHERE id = $4 AND organization_id = $5
       RETURNING *`,
      [name, category, description, skillId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error.constraint === 'unique_org_skill') {
      return res.status(400).json({
        success: false,
        error: 'A skill with this name already exists in your organization'
      });
    }
    
    console.error('Error updating skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skill'
    });
  }
};

// @desc    Delete a skill
// @route   DELETE /api/v1/organizations/:orgId/skills/:skillId
// @access  Private (Admin)
export const deleteSkill = async (req, res) => {
  try {
    const { orgId, skillId } = req.params;

    // Verify admin role
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only admins or consultants can delete skills'
      });
    }

    // Check if skill is in use
    const usageCheck = await query(
      `SELECT COUNT(*) FROM position_skills WHERE skill_id = $1
       UNION ALL
       SELECT COUNT(*) FROM user_skills WHERE skill_id = $1`,
      [skillId]
    );

    const totalUsage = usageCheck.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    if (totalUsage > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete skill that is in use. Remove it from all positions and users first.'
      });
    }

    const result = await query(
      'DELETE FROM skills WHERE id = $1 AND organization_id = $2',
      [skillId, orgId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    res.json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill'
    });
  }
};

// @desc    Get user skills
// @route   GET /api/v1/organizations/:orgId/users/:userId/skills
// @access  Private
export const getUserSkills = async (req, res) => {
  try {
    const { orgId, userId: targetUserId } = req.params;

    // Users can view their own skills or admins/managers can view anyone's
    if (req.user.id !== targetUserId && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const result = await query(
      `SELECT 
        us.*,
        s.name as skill_name,
        s.category,
        s.description,
        v.first_name || ' ' || v.last_name as verified_by_name
       FROM user_skills us
       JOIN skills s ON us.skill_id = s.id
       LEFT JOIN users v ON us.verified_by = v.id
       WHERE us.user_id = $1 AND s.organization_id = $2
       ORDER BY s.category, s.name`,
      [targetUserId, orgId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching user skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user skills'
    });
  }
};

// @desc    Add or update user skill
// @route   POST /api/v1/organizations/:orgId/users/:userId/skills
// @access  Private (Self or Manager)
export const upsertUserSkill = async (req, res) => {
  try {
    const { orgId, userId: targetUserId } = req.params;
    const { skillId, proficiencyLevel } = req.body;
    const userId = req.user.id;

    // Users can update their own skills or managers can update anyone's
    if (userId !== targetUserId && req.user.role !== 'manager' && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only managers can update other users\' skills'
      });
    }

    // Check if skill exists and belongs to organization
    const skillCheck = await query(
      'SELECT id FROM skills WHERE id = $1 AND organization_id = $2',
      [skillId, orgId]
    );

    if (skillCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    // Check if user skill already exists
    const existingCheck = await query(
      'SELECT id FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [targetUserId, skillId]
    );

    let result;
    if (existingCheck.rows.length > 0) {
      // Update existing
      result = await query(
        `UPDATE user_skills 
         SET proficiency_level = $1, verified_by = $2, verified_at = $3
         WHERE user_id = $4 AND skill_id = $5
         RETURNING *`,
        [proficiencyLevel, userId !== targetUserId ? userId : null, 
         userId !== targetUserId ? new Date() : null, targetUserId, skillId]
      );
    } else {
      // Create new
      const userSkillId = uuidv4();
      result = await query(
        `INSERT INTO user_skills 
         (id, user_id, skill_id, proficiency_level, verified_by, verified_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userSkillId, targetUserId, skillId, proficiencyLevel, 
         userId !== targetUserId ? userId : null, userId !== targetUserId ? new Date() : null]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user skill'
    });
  }
};

// @desc    Remove user skill
// @route   DELETE /api/v1/organizations/:orgId/users/:userId/skills/:skillId
// @access  Private (Self or Manager)
export const removeUserSkill = async (req, res) => {
  try {
    const { orgId, userId: targetUserId, skillId } = req.params;
    const userId = req.user.id;

    // Users can remove their own skills or managers can remove anyone's
    if (userId !== targetUserId && req.user.role !== 'manager' && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only managers can remove other users\' skills'
      });
    }

    const result = await query(
      'DELETE FROM user_skills WHERE user_id = $1 AND skill_id = $2',
      [targetUserId, skillId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'User skill not found'
      });
    }

    res.json({
      success: true,
      message: 'User skill removed successfully'
    });
  } catch (error) {
    console.error('Error removing user skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove user skill'
    });
  }
};

export default {
  getOrganizationSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getUserSkills,
  upsertUserSkill,
  removeUserSkill
};