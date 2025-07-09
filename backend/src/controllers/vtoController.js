import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get VTO for a team
// @route   GET /api/v1/organizations/:orgId/teams/:teamId/vto
// @access  Private
export const getVTO = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { departmentId } = req.query; // Support department filter
    const userId = req.user.userId;

    // Check user has access to this organization
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
      [userId, orgId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get VTO - support both team-level and department-level VTOs
    let vtoResult;
    if (departmentId) {
      vtoResult = await query(
        'SELECT * FROM vtos WHERE organization_id = $1 AND department_id = $2',
        [orgId, departmentId]
      );
    } else {
      vtoResult = await query(
        'SELECT * FROM vtos WHERE organization_id = $1 AND team_id = $2',
        [orgId, teamId]
      );
    }

    let vto;
    if (vtoResult.rows.length === 0) {
      // Create default VTO if none exists
      const newVtoId = uuidv4();
      if (departmentId) {
        await query(
          'INSERT INTO vtos (id, organization_id, department_id) VALUES ($1, $2, $3)',
          [newVtoId, orgId, departmentId]
        );
        vto = { id: newVtoId, organization_id: orgId, department_id: departmentId };
      } else {
        await query(
          'INSERT INTO vtos (id, organization_id, team_id) VALUES ($1, $2, $3)',
          [newVtoId, orgId, teamId]
        );
        vto = { id: newVtoId, organization_id: orgId, team_id: teamId };
      }
    } else {
      vto = vtoResult.rows[0];
    }

    // Get all VTO components
    const [coreValues, coreFocus, tenYearTarget, marketingStrategy, threeYearPicture, oneYearPlan] = await Promise.all([
      query('SELECT * FROM core_values WHERE vto_id = $1 ORDER BY sort_order', [vto.id]),
      query('SELECT * FROM core_focus WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM ten_year_targets WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM marketing_strategies WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM three_year_pictures WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM one_year_plans WHERE vto_id = $1', [vto.id])
    ]);

    // Get sub-components for 3-year and 1-year plans
    let threeYearMeasurables = [];
    let oneYearGoals = [];
    let oneYearMeasurables = [];

    if (threeYearPicture.rows.length > 0) {
      threeYearMeasurables = await query(
        'SELECT * FROM three_year_measurables WHERE three_year_picture_id = $1',
        [threeYearPicture.rows[0].id]
      );
    }

    if (oneYearPlan.rows.length > 0) {
      [oneYearGoals, oneYearMeasurables] = await Promise.all([
        query('SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_measurables WHERE one_year_plan_id = $1', [oneYearPlan.rows[0].id])
      ]);
    }

    res.json({
      success: true,
      data: {
        vto: vto,
        coreValues: coreValues.rows,
        coreFocus: coreFocus.rows[0] || null,
        tenYearTarget: tenYearTarget.rows[0] || null,
        marketingStrategy: marketingStrategy.rows[0] || null,
        threeYearPicture: {
          ...threeYearPicture.rows[0],
          measurables: threeYearMeasurables.rows
        },
        oneYearPlan: {
          ...oneYearPlan.rows[0],
          goals: oneYearGoals.rows,
          measurables: oneYearMeasurables.rows
        }
      }
    });
  } catch (error) {
    console.error('Error fetching VTO:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch VTO'
    });
  }
};

// @desc    Create or update core value
// @route   POST /api/v1/organizations/:orgId/teams/:teamId/vto/core-values
// @access  Private
export const upsertCoreValue = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { id, value, description, sortOrder } = req.body;
    const userId = req.user.userId;

    // Get VTO ID
    const vtoResult = await query(
      'SELECT id FROM vtos WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );

    if (vtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VTO not found'
      });
    }

    const vtoId = vtoResult.rows[0].id;

    if (id) {
      // Update existing
      const result = await query(
        `UPDATE core_values 
         SET value_text = $1, description = $2, sort_order = $3, updated_at = NOW()
         WHERE id = $4 AND vto_id = $5
         RETURNING *`,
        [value, description, sortOrder || 0, id, vtoId]
      );

      res.json({
        success: true,
        data: result.rows[0]
      });
    } else {
      // Create new
      const newId = uuidv4();
      const result = await query(
        `INSERT INTO core_values (id, vto_id, value_text, description, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newId, vtoId, value, description, sortOrder || 0]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error upserting core value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save core value'
    });
  }
};

// @desc    Delete core value
// @route   DELETE /api/v1/organizations/:orgId/teams/:teamId/vto/core-values/:valueId
// @access  Private
export const deleteCoreValue = async (req, res) => {
  try {
    const { orgId, teamId, valueId } = req.params;
    const userId = req.user.userId;

    // Verify access and delete
    const result = await query(
      `DELETE FROM core_values 
       WHERE id = $1 
       AND vto_id IN (
         SELECT id FROM vtos 
         WHERE organization_id = $2 AND team_id = $3
       )`,
      [valueId, orgId, teamId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Core value not found'
      });
    }

    res.json({
      success: true,
      message: 'Core value deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting core value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete core value'
    });
  }
};

// @desc    Update core focus
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/vto/core-focus
// @access  Private
export const updateCoreFocus = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { purpose, niche } = req.body;
    const userId = req.user.userId;

    // Get VTO ID
    const vtoResult = await query(
      'SELECT id FROM vtos WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );

    if (vtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VTO not found'
      });
    }

    const vtoId = vtoResult.rows[0].id;

    // Check if core focus exists
    const existing = await query(
      'SELECT id FROM core_focus WHERE vto_id = $1',
      [vtoId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await query(
        `UPDATE core_focus 
         SET purpose_cause_passion = $1, niche = $2, updated_at = NOW()
         WHERE vto_id = $3
         RETURNING *`,
        [purpose, niche, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO core_focus (id, vto_id, purpose_cause_passion, niche)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [newId, vtoId, purpose, niche]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating core focus:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update core focus'
    });
  }
};

// @desc    Update 10-year target
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/vto/ten-year-target
// @access  Private
export const updateTenYearTarget = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { targetDescription, targetYear, runningTotalDescription, currentRunningTotal } = req.body;
    const userId = req.user.userId;

    // Get VTO ID
    const vtoResult = await query(
      'SELECT id FROM vtos WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );

    if (vtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VTO not found'
      });
    }

    const vtoId = vtoResult.rows[0].id;

    // Check if target exists
    const existing = await query(
      'SELECT id FROM ten_year_targets WHERE vto_id = $1',
      [vtoId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await query(
        `UPDATE ten_year_targets 
         SET target_description = $1, target_year = $2, 
             running_total_description = $3, current_running_total = $4, 
             updated_at = NOW()
         WHERE vto_id = $5
         RETURNING *`,
        [targetDescription, targetYear, runningTotalDescription, currentRunningTotal || 0, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO ten_year_targets 
         (id, vto_id, target_description, target_year, running_total_description, current_running_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [newId, vtoId, targetDescription, targetYear, runningTotalDescription, currentRunningTotal || 0]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating 10-year target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update 10-year target'
    });
  }
};

// @desc    Update marketing strategy
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/vto/marketing-strategy
// @access  Private
export const updateMarketingStrategy = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { targetMarket, threeUniques, provenProcess, guarantee } = req.body;
    const userId = req.user.userId;

    // Get VTO ID
    const vtoResult = await query(
      'SELECT id FROM vtos WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );

    if (vtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VTO not found'
      });
    }

    const vtoId = vtoResult.rows[0].id;

    // Check if strategy exists
    const existing = await query(
      'SELECT id FROM marketing_strategies WHERE vto_id = $1',
      [vtoId]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update
      result = await query(
        `UPDATE marketing_strategies 
         SET target_market = $1, three_uniques = $2, 
             proven_process = $3, guarantee = $4, 
             updated_at = NOW()
         WHERE vto_id = $5
         RETURNING *`,
        [targetMarket, threeUniques, provenProcess, guarantee, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO marketing_strategies 
         (id, vto_id, target_market, three_uniques, proven_process, guarantee)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [newId, vtoId, targetMarket, threeUniques, provenProcess, guarantee]
      );
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating marketing strategy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update marketing strategy'
    });
  }
};

// @desc    Get VTO for a department
// @route   GET /api/v1/departments/:departmentId/vto
// @access  Private
export const getDepartmentVTO = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { organizationId } = req.user;

    // Verify department belongs to organization
    const deptCheck = await query(
      'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
      [departmentId, organizationId]
    );

    if (deptCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Get VTO
    const vtoResult = await query(
      'SELECT * FROM vtos WHERE department_id = $1',
      [departmentId]
    );

    let vto;
    if (vtoResult.rows.length === 0) {
      // Create default VTO if none exists
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO vtos (id, organization_id, department_id) VALUES ($1, $2, $3)',
        [newVtoId, organizationId, departmentId]
      );
      vto = { id: newVtoId, organization_id: organizationId, department_id: departmentId };
    } else {
      vto = vtoResult.rows[0];
    }

    // Get all VTO components (same as getVTO)
    const [coreValues, coreFocus, tenYearTarget, marketingStrategy, threeYearPicture, oneYearPlan] = await Promise.all([
      query('SELECT * FROM core_values WHERE vto_id = $1 ORDER BY sort_order', [vto.id]),
      query('SELECT * FROM core_focus WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM ten_year_targets WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM marketing_strategies WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM three_year_pictures WHERE vto_id = $1', [vto.id]),
      query('SELECT * FROM one_year_plans WHERE vto_id = $1', [vto.id])
    ]);

    // Get sub-components for 3-year and 1-year plans
    let threeYearMeasurables = [];
    let oneYearGoals = [];
    let oneYearMeasurables = [];

    if (threeYearPicture.rows.length > 0) {
      threeYearMeasurables = await query(
        'SELECT * FROM three_year_measurables WHERE three_year_picture_id = $1 ORDER BY sort_order',
        [threeYearPicture.rows[0].id]
      );
    }

    if (oneYearPlan.rows.length > 0) {
      [oneYearGoals, oneYearMeasurables] = await Promise.all([
        query('SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_measurables WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id])
      ]);
    }

    res.json({
      success: true,
      data: {
        vto,
        coreValues: coreValues.rows,
        coreFocus: coreFocus.rows[0] || null,
        tenYearTarget: tenYearTarget.rows[0] || null,
        marketingStrategy: marketingStrategy.rows[0] || null,
        threeYearPicture: {
          ...threeYearPicture.rows[0],
          measurables: threeYearMeasurables.rows
        } || null,
        oneYearPlan: {
          ...oneYearPlan.rows[0],
          goals: oneYearGoals.rows,
          measurables: oneYearMeasurables.rows
        } || null
      }
    });
  } catch (error) {
    console.error('Error fetching department VTO:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching VTO'
    });
  }
};

export default {
  getVTO,
  getDepartmentVTO,
  upsertCoreValue,
  deleteCoreValue,
  updateCoreFocus,
  updateTenYearTarget,
  updateMarketingStrategy
};