import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get or create VTO
const getOrCreateVTO = async (orgId, teamId) => {
  // First try to find without team_id (organization-level)
  let vtoResult = await query(
    'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
    [orgId]
  );

  if (vtoResult.rows.length === 0) {
    // Create VTO if it doesn't exist - without team_id for now
    const newVtoId = uuidv4();
    await query(
      'INSERT INTO business_blueprints (id, organization_id) VALUES ($1, $2)',
      [newVtoId, orgId]
    );
    return newVtoId;
  }
  
  return vtoResult.rows[0].id;
};

// @desc    Get VTO for a team
// @route   GET /api/v1/organizations/:orgId/teams/:teamId/vto
// @access  Private
export const getVTO = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { departmentId } = req.query; // Support department filter
    const userId = req.user.id;

    // Verify access - either user belongs to org or is consultant with access
    if (req.user.organizationId !== orgId && !req.user.isImpersonating) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get VTO - look for organization-level VTO (team_id = NULL)
    let vtoResult = await query(
      'SELECT * FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
      [orgId]
    );

    let vto;
    if (vtoResult.rows.length === 0) {
      // Create default VTO if none exists - organization level for now
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO business_blueprints (id, organization_id) VALUES ($1, $2)',
        [newVtoId, orgId]
      );
      vto = { id: newVtoId, organization_id: orgId };
    } else {
      vto = vtoResult.rows[0];
    }

    // Get current quarter and year
    const currentDate = new Date();
    const currentQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
    const currentYear = currentDate.getFullYear();

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

    // Get current quarterly priorities
    const quarterlyPriorities = await query(
      `SELECT p.id, p.title, p.status 
       FROM quarterly_priorities p
       WHERE p.organization_id = $1 
       AND p.quarter = $2 
       AND p.year = $3
       AND p.is_archived = false
       ORDER BY p.created_at`,
      [orgId, currentQuarter, currentYear]
    );

    res.json({
      success: true,
      data: {
        vto: vto,
        coreValues: coreValues.rows.map(cv => ({
          ...cv,
          value: cv.value_text  // Map value_text to value for frontend compatibility
        })),
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
        },
        quarterlyPriorities: quarterlyPriorities.rows.length > 0 ? {
          quarter: currentQuarter,
          year: currentYear,
          priorities: quarterlyPriorities.rows
        } : null
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
    const userId = req.user.id;

    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);

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
        data: {
          ...result.rows[0],
          value: result.rows[0].value_text  // Map value_text to value
        }
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
        data: {
          ...result.rows[0],
          value: result.rows[0].value_text  // Map value_text to value
        }
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
    const userId = req.user.id;

    // Verify access and delete
    const result = await query(
      `DELETE FROM core_values 
       WHERE id = $1 
       AND vto_id IN (
         SELECT id FROM business_blueprints 
         WHERE organization_id = $2 AND team_id IS NULL
       )`,
      [valueId, orgId]
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

// @desc    Update core focus (Hedgehog)
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/vto/core-focus
// @access  Private
export const updateCoreFocus = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { purpose, niche, hedgehogType } = req.body;
    const userId = req.user.id;

    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);

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
         SET purpose_cause_passion = $1, niche = $2, hedgehog_type = $3, updated_at = NOW()
         WHERE vto_id = $4
         RETURNING *`,
        [purpose, niche, hedgehogType, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO core_focus (id, vto_id, purpose_cause_passion, niche, hedgehog_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newId, vtoId, purpose, niche, hedgehogType]
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
    const userId = req.user.id;

    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);

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
    const { 
      targetMarket, 
      differentiator1, 
      differentiator2, 
      differentiator3,
      provenProcessExists,
      guaranteeExists
    } = req.body;
    const userId = req.user.id;

    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);

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
         SET target_market = $1, differentiator_1 = $2, differentiator_2 = $3,
             differentiator_3 = $4, proven_process_exists = $5, guarantee_exists = $6,
             updated_at = NOW()
         WHERE vto_id = $7
         RETURNING *`,
        [targetMarket, differentiator1, differentiator2, differentiator3, provenProcessExists, guaranteeExists, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO marketing_strategies 
         (id, vto_id, target_market, differentiator_1, differentiator_2, differentiator_3, proven_process_exists, guarantee_exists)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [newId, vtoId, targetMarket, differentiator1, differentiator2, differentiator3, provenProcessExists, guaranteeExists]
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

// @desc    Get Business Blueprint for a department
// @route   GET /api/v1/departments/:departmentId/business-blueprint
// @access  Private
export const getDepartmentBusinessBlueprint = async (req, res) => {
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
      'SELECT * FROM business_blueprints WHERE department_id = $1',
      [departmentId]
    );

    let vto;
    if (vtoResult.rows.length === 0) {
      // Create default VTO if none exists
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO business_blueprints (id, organization_id, department_id) VALUES ($1, $2, $3)',
        [newVtoId, organizationId, departmentId]
      );
      vto = { id: newVtoId, organization_id: organizationId, department_id: departmentId };
    } else {
      vto = vtoResult.rows[0];
    }

    // Get current quarter and year
    const currentDate = new Date();
    const currentQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
    const currentYear = currentDate.getFullYear();

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

    // Get current quarterly priorities for department
    const quarterlyPriorities = await query(
      `SELECT p.id, p.title, p.status 
       FROM quarterly_priorities p
       WHERE p.department_id = $1 
       AND p.quarter = $2 
       AND p.year = $3
       AND p.is_archived = false
       ORDER BY p.created_at`,
      [departmentId, currentQuarter, currentYear]
    );

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
        } || null,
        quarterlyPriorities: quarterlyPriorities.rows.length > 0 ? {
          quarter: currentQuarter,
          year: currentYear,
          priorities: quarterlyPriorities.rows
        } : null
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

// @desc    Update three year picture
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/business-blueprint/three-year-picture
// @access  Private
export const updateThreeYearPicture = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    let { revenue, profit, measurables, lookLikeItems, futureDate } = req.body;
    
    // Convert revenue and profit to numbers if they're strings
    revenue = revenue ? parseFloat(revenue) : null;
    profit = profit ? parseFloat(profit) : null;
    
    // Validate futureDate
    if (!futureDate) {
      return res.status(400).json({
        success: false,
        error: 'Target date is required'
      });
    }
    
    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);
    
    // Check if three year picture exists
    const existing = await query(
      'SELECT id FROM three_year_pictures WHERE vto_id = $1',
      [vtoId]
    );
    
    let pictureResult;
    if (existing.rows.length > 0) {
      // Update
      pictureResult = await query(
        `UPDATE three_year_pictures 
         SET revenue_target = $1, profit_target = $2, future_date = $3, updated_at = NOW()
         WHERE vto_id = $4
         RETURNING *`,
        [revenue, profit, futureDate, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      pictureResult = await query(
        `INSERT INTO three_year_pictures (id, vto_id, future_date, revenue_target, profit_target)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newId, vtoId, futureDate, revenue, profit]
      );
    }
    
    const pictureId = pictureResult.rows[0].id;
    
    // Handle measurables
    if (measurables && Array.isArray(measurables)) {
      // Delete existing measurables
      await query('DELETE FROM three_year_measurables WHERE three_year_picture_id = $1', [pictureId]);
      
      // Insert new measurables
      for (let i = 0; i < measurables.length; i++) {
        const measurable = measurables[i];
        if (measurable.name || measurable.value) {
          await query(
            `INSERT INTO three_year_measurables (id, three_year_picture_id, measurable_name, measurable_value, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), pictureId, measurable.name, measurable.value, i]
          );
        }
      }
    }
    
    // Handle look like items (for now store as JSON in a text field)
    if (lookLikeItems && Array.isArray(lookLikeItems)) {
      await query(
        `UPDATE three_year_pictures 
         SET what_does_it_look_like = $1
         WHERE id = $2`,
        [JSON.stringify(lookLikeItems), pictureId]
      );
    }
    
    res.json({
      success: true,
      data: pictureResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating three year picture:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating three year picture'
    });
  }
};

// @desc    Update one year plan
// @route   PUT /api/v1/organizations/:orgId/teams/:teamId/business-blueprint/one-year-plan
// @access  Private
export const updateOneYearPlan = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    let { revenue, profit, targetDate, goals, measurables } = req.body;
    
    // Convert revenue and profit to numbers if they're strings
    revenue = revenue ? parseFloat(revenue) : null;
    profit = profit ? parseFloat(profit) : null;
    
    // Validate targetDate
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        error: 'Target date is required'
      });
    }
    
    // Get or create VTO
    const vtoId = await getOrCreateVTO(orgId, teamId);
    
    // Check if one year plan exists
    const existing = await query(
      'SELECT id FROM one_year_plans WHERE vto_id = $1',
      [vtoId]
    );
    
    let planResult;
    if (existing.rows.length > 0) {
      // Update
      planResult = await query(
        `UPDATE one_year_plans 
         SET revenue_target = $1, profit_percentage = $2, future_date = $3, updated_at = NOW()
         WHERE vto_id = $4
         RETURNING *`,
        [revenue, profit, targetDate, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      planResult = await query(
        `INSERT INTO one_year_plans (id, vto_id, future_date, revenue_target, profit_percentage)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newId, vtoId, targetDate, revenue, profit]
      );
    }
    
    const planId = planResult.rows[0].id;
    
    // Handle goals
    if (goals && Array.isArray(goals)) {
      // Delete existing goals
      await query('DELETE FROM one_year_goals WHERE one_year_plan_id = $1', [planId]);
      
      // Insert new goals
      for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        if (goal && goal.trim()) {
          await query(
            `INSERT INTO one_year_goals (id, one_year_plan_id, goal_text, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), planId, goal.trim(), i]
          );
        }
      }
    }
    
    // Handle measurables (similar to three-year picture)
    if (measurables) {
      // For now, we'll store measurables as text. In the future, we could make this a dynamic list too
      await query(
        `UPDATE one_year_plans 
         SET profit_target = $1
         WHERE id = $2`,
        [measurables, planId]
      );
    }
    
    res.json({
      success: true,
      data: planResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating one year plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating one year plan'
    });
  }
};

export default {
  getVTO,
  getDepartmentBusinessBlueprint,
  upsertCoreValue,
  deleteCoreValue,
  updateCoreFocus,
  updateTenYearTarget,
  updateMarketingStrategy,
  updateThreeYearPicture,
  updateOneYearPlan
};