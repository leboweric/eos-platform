import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get or create VTO
const getOrCreateVTO = async (orgId, teamId) => {
  // Check if this is for a department (not leadership team)
  const isDepartment = teamId && teamId !== '00000000-0000-0000-0000-000000000000';
  
  let vtoResult;
  if (isDepartment) {
    // Department-level blueprint
    vtoResult = await query(
      'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id = $2',
      [orgId, teamId]
    );
    
    if (vtoResult.rows.length === 0) {
      // Create department blueprint
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO business_blueprints (id, organization_id, team_id) VALUES ($1, $2, $3)',
        [newVtoId, orgId, teamId]
      );
      return newVtoId;
    }
  } else {
    // Organization-level blueprint
    vtoResult = await query(
      'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
      [orgId]
    );
    
    if (vtoResult.rows.length === 0) {
      // Create org blueprint
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO business_blueprints (id, organization_id) VALUES ($1, $2)',
        [newVtoId, orgId]
      );
      return newVtoId;
    }
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

    // Check if this is for a department (not a leadership team)
    let isDepartment = false;
    if (teamId && teamId !== '00000000-0000-0000-0000-000000000000') {
      // Check if this team is a leadership team
      const teamResult = await query(
        'SELECT is_leadership_team FROM teams WHERE id = $1 AND organization_id = $2',
        [teamId, orgId]
      );
      
      // Only treat as department if NOT a leadership team
      isDepartment = teamResult.rows.length > 0 && !teamResult.rows[0].is_leadership_team;
    }
    console.log('getVTO - teamId:', teamId, 'isDepartment:', isDepartment);
    
    // Always get org-level VTO for shared components
    let orgVtoResult = await query(
      'SELECT * FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
      [orgId]
    );

    let orgVto;
    if (orgVtoResult.rows.length === 0) {
      // Create default org VTO if none exists
      const newVtoId = uuidv4();
      await query(
        'INSERT INTO business_blueprints (id, organization_id) VALUES ($1, $2)',
        [newVtoId, orgId]
      );
      orgVto = { id: newVtoId, organization_id: orgId };
    } else {
      orgVto = orgVtoResult.rows[0];
    }
    
    // For departments, also get their specific blueprint
    let deptVto = null;
    if (isDepartment) {
      const deptVtoResult = await query(
        'SELECT * FROM business_blueprints WHERE organization_id = $1 AND team_id = $2',
        [orgId, teamId]
      );
      
      if (deptVtoResult.rows.length > 0) {
        deptVto = deptVtoResult.rows[0];
      } else {
        // Create department blueprint if it doesn't exist
        const newDeptVtoId = uuidv4();
        await query(
          'INSERT INTO business_blueprints (id, organization_id, team_id) VALUES ($1, $2, $3)',
          [newDeptVtoId, orgId, teamId]
        );
        deptVto = { id: newDeptVtoId, organization_id: orgId, team_id: teamId };
      }
    }

    // Get current quarter and year
    const currentDate = new Date();
    const currentQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
    const currentYear = currentDate.getFullYear();

    // Get shared components from org VTO
    const [coreValues, coreFocus, tenYearTarget, marketingStrategy] = await Promise.all([
      query('SELECT * FROM core_values WHERE vto_id = $1 ORDER BY sort_order', [orgVto.id]),
      query('SELECT * FROM core_focus WHERE vto_id = $1', [orgVto.id]),
      query('SELECT * FROM ten_year_targets WHERE vto_id = $1', [orgVto.id]),
      query('SELECT * FROM marketing_strategies WHERE vto_id = $1', [orgVto.id])
    ]);
    
    // Get 3-year and 1-year from department VTO if department, else from org VTO
    const vtoIdForPlans = deptVto ? deptVto.id : orgVto.id;
    console.log('getVTO - Using VTO ID for plans:', vtoIdForPlans, 'from', deptVto ? 'department' : 'org');
    const [threeYearPicture, oneYearPlan] = await Promise.all([
      query('SELECT * FROM three_year_pictures WHERE vto_id = $1', [vtoIdForPlans]),
      query('SELECT * FROM one_year_plans WHERE vto_id = $1', [vtoIdForPlans])
    ]);

    // Get sub-components for 3-year and 1-year plans
    let threeYearMeasurables = [];
    let threeYearRevenueStreams = [];
    let oneYearGoals = [];
    let oneYearMeasurables = [];
    let oneYearRevenueStreams = [];

    if (threeYearPicture.rows.length > 0) {
      [threeYearMeasurables, threeYearRevenueStreams] = await Promise.all([
        query('SELECT * FROM three_year_measurables WHERE three_year_picture_id = $1', [threeYearPicture.rows[0].id]),
        query('SELECT * FROM three_year_revenue_streams WHERE three_year_picture_id = $1 ORDER BY display_order', [threeYearPicture.rows[0].id])
      ]);
    }

    if (oneYearPlan.rows.length > 0) {
      [oneYearGoals, oneYearMeasurables, oneYearRevenueStreams] = await Promise.all([
        query('SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_measurables WHERE one_year_plan_id = $1', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_revenue_streams WHERE one_year_plan_id = $1 ORDER BY display_order', [oneYearPlan.rows[0].id])
      ]);
    }

    // Get current quarterly priorities
    const quarterlyPriorities = await query(
      `SELECT p.id, p.title, p.status, p.owner_id, p.is_company_priority,
              u.first_name || ' ' || u.last_name as owner_name,
              t.name as team_name
       FROM quarterly_priorities p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN teams t ON p.team_id = t.id
       WHERE p.organization_id = $1 
       AND p.quarter = $2 
       AND p.year = $3
       AND p.deleted_at IS NULL
       ORDER BY p.is_company_priority DESC, p.created_at`,
      [orgId, currentQuarter, currentYear]
    );

    // Get long term issues
    const longTermIssues = await query(
      `SELECT i.id, i.title 
       FROM issues i
       WHERE i.organization_id = $1 
       AND i.timeline = 'long_term'
       AND i.archived = false
       AND i.status IN ('open', 'in-progress')
       ORDER BY i.priority_rank, i.created_at`,
      [orgId]
    );

    res.json({
      success: true,
      data: {
        vto: orgVto,  // Always return org VTO for base structure
        isDepartment: isDepartment,  // Let frontend know if this is department data
        coreValues: coreValues.rows.map(cv => ({
          ...cv,
          value: cv.value_text  // Map value_text to value for frontend compatibility
        })),
        coreFocus: coreFocus.rows[0] || null,
        tenYearTarget: tenYearTarget.rows[0] || null,
        marketingStrategy: marketingStrategy.rows[0] || null,
        threeYearPicture: {
          ...threeYearPicture.rows[0],
          measurables: threeYearMeasurables.rows,
          revenueStreams: threeYearRevenueStreams.rows
        },
        oneYearPlan: {
          ...oneYearPlan.rows[0],
          goals: oneYearGoals.rows,
          measurables: oneYearMeasurables.rows,
          revenueStreams: oneYearRevenueStreams.rows
        },
        quarterlyPriorities: quarterlyPriorities.rows.length > 0 ? {
          quarter: currentQuarter,
          year: currentYear,
          priorities: quarterlyPriorities.rows
        } : null,
        longTermIssues: longTermIssues.rows
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

    // Get or create VTO - use department VTO if teamId is provided and not leadership
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

    // Get or create VTO - use department VTO if teamId is provided and not leadership
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

    // Get or create VTO - use department VTO if teamId is provided and not leadership
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
      demographicProfile,
      geographicProfile,
      psychographicProfile,
      differentiator1, 
      differentiator2, 
      differentiator3,
      differentiator4,
      differentiator5,
      provenProcessExists,
      guaranteeExists,
      guaranteeDescription
    } = req.body;
    const userId = req.user.id;

    // Get or create VTO - use department VTO if teamId is provided and not leadership
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
         SET target_market = $1, demographic_profile = $2, geographic_profile = $3,
             psychographic_profile = $4, differentiator_1 = $5, differentiator_2 = $6,
             differentiator_3 = $7, differentiator_4 = $8, differentiator_5 = $9,
             proven_process_exists = $10, guarantee_exists = $11, guarantee_description = $12,
             updated_at = NOW()
         WHERE vto_id = $13
         RETURNING *`,
        [targetMarket, demographicProfile, geographicProfile, psychographicProfile, 
         differentiator1, differentiator2, differentiator3, differentiator4, differentiator5, 
         provenProcessExists, guaranteeExists, guaranteeDescription, vtoId]
      );
    } else {
      // Create
      const newId = uuidv4();
      result = await query(
        `INSERT INTO marketing_strategies 
         (id, vto_id, target_market, demographic_profile, geographic_profile, psychographic_profile,
          differentiator_1, differentiator_2, differentiator_3, differentiator_4, differentiator_5, 
          proven_process_exists, guarantee_exists, guarantee_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [newId, vtoId, targetMarket, demographicProfile, geographicProfile, psychographicProfile,
         differentiator1, differentiator2, differentiator3, differentiator4, differentiator5, 
         provenProcessExists, guaranteeExists, guaranteeDescription]
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
    let threeYearRevenueStreams = [];
    let oneYearGoals = [];
    let oneYearMeasurables = [];
    let oneYearRevenueStreams = [];

    if (threeYearPicture.rows.length > 0) {
      [threeYearMeasurables, threeYearRevenueStreams] = await Promise.all([
        query('SELECT * FROM three_year_measurables WHERE three_year_picture_id = $1 ORDER BY sort_order', [threeYearPicture.rows[0].id]),
        query('SELECT * FROM three_year_revenue_streams WHERE three_year_picture_id = $1 ORDER BY display_order', [threeYearPicture.rows[0].id])
      ]);
    }

    if (oneYearPlan.rows.length > 0) {
      [oneYearGoals, oneYearMeasurables, oneYearRevenueStreams] = await Promise.all([
        query('SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_measurables WHERE one_year_plan_id = $1 ORDER BY sort_order', [oneYearPlan.rows[0].id]),
        query('SELECT * FROM one_year_revenue_streams WHERE one_year_plan_id = $1 ORDER BY display_order', [oneYearPlan.rows[0].id])
      ]);
    }

    // Get current quarterly priorities for department
    const quarterlyPriorities = await query(
      `SELECT p.id, p.title, p.status, p.owner_id, p.is_company_priority,
              u.first_name || ' ' || u.last_name as owner_name,
              t.name as team_name
       FROM quarterly_priorities p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN teams t ON p.team_id = t.id
       WHERE p.department_id = $1 
       AND p.quarter = $2 
       AND p.year = $3
       AND p.deleted_at IS NULL
       ORDER BY p.is_company_priority DESC, p.created_at`,
      [departmentId, currentQuarter, currentYear]
    );

    // Get long term issues for department
    const longTermIssues = await query(
      `SELECT i.id, i.title 
       FROM issues i
       WHERE i.organization_id = $1 
       AND (i.team_id = $2 OR i.team_id IS NULL)
       AND i.timeline = 'long_term'
       AND i.archived = false
       AND i.status IN ('open', 'in-progress')
       ORDER BY i.priority_rank, i.created_at`,
      [organizationId, departmentId]
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
          measurables: threeYearMeasurables.rows,
          revenueStreams: threeYearRevenueStreams.rows
        } || null,
        oneYearPlan: {
          ...oneYearPlan.rows[0],
          goals: oneYearGoals.rows,
          measurables: oneYearMeasurables.rows,
          revenueStreams: oneYearRevenueStreams.rows
        } || null,
        quarterlyPriorities: quarterlyPriorities.rows.length > 0 ? {
          quarter: currentQuarter,
          year: currentYear,
          priorities: quarterlyPriorities.rows
        } : null,
        longTermIssues: longTermIssues.rows
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
    let { revenue, profit, measurables, lookLikeItems, futureDate, revenueStreams } = req.body;
    
    // Parse revenue - handle formatted strings like "$550M" or "550K"
    if (revenue && typeof revenue === 'string') {
      // Remove currency symbols and spaces
      let cleanRevenue = revenue.replace(/[$,\s]/g, '');
      
      // Check for M (millions) or K (thousands) suffix
      if (cleanRevenue.toUpperCase().endsWith('M')) {
        revenue = parseFloat(cleanRevenue.slice(0, -1));
      } else if (cleanRevenue.toUpperCase().endsWith('K')) {
        revenue = parseFloat(cleanRevenue.slice(0, -1)) / 1000; // Convert K to millions
      } else {
        revenue = parseFloat(cleanRevenue);
      }
    } else {
      revenue = revenue ? parseFloat(revenue) : null;
    }
    
    // Convert profit to number if it's a string
    profit = profit ? parseFloat(profit) : null;
    
    // Validate futureDate
    if (!futureDate) {
      return res.status(400).json({
        success: false,
        error: 'Target date is required'
      });
    }
    
    // Ensure the date is in YYYY-MM-DD format without timezone adjustments
    // This prevents timezone conversion issues with DATE columns
    if (futureDate.includes('T')) {
      futureDate = futureDate.split('T')[0];
    }
    
    // Get or create VTO - use department VTO if teamId is provided and not leadership
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
    
    // Handle revenue streams
    if (revenueStreams && Array.isArray(revenueStreams)) {
      // Delete existing revenue streams
      await query('DELETE FROM three_year_revenue_streams WHERE three_year_picture_id = $1', [pictureId]);
      
      // Insert new revenue streams
      for (let i = 0; i < revenueStreams.length; i++) {
        const stream = revenueStreams[i];
        if (stream.name && stream.revenue_target !== undefined) {
          await query(
            `INSERT INTO three_year_revenue_streams (id, three_year_picture_id, name, revenue_target, display_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), pictureId, stream.name, stream.revenue_target, i]
          );
        }
      }
    }
    
    // Handle measurables
    if (measurables && Array.isArray(measurables)) {
      // Delete existing measurables
      await query('DELETE FROM three_year_measurables WHERE three_year_picture_id = $1', [pictureId]);
      
      // Insert new measurables
      for (let i = 0; i < measurables.length; i++) {
        const measurable = measurables[i];
        if (measurable.name || measurable.value) {
          await query(
            `INSERT INTO three_year_measurables (id, three_year_picture_id, name, target_value)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), pictureId, measurable.name, measurable.value || '0']
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
    let { revenue, profit, targetDate, goals, measurables, revenueStreams } = req.body;
    
    console.log('Backend - Received goals:', goals);
    console.log('Backend - Goals type:', typeof goals);
    console.log('Backend - Goals is array:', Array.isArray(goals));
    
    // Parse revenue - handle formatted strings like "$550M" or "550K"
    if (revenue && typeof revenue === 'string') {
      // Remove currency symbols and spaces
      let cleanRevenue = revenue.replace(/[$,\s]/g, '');
      
      // Check for M (millions) or K (thousands) suffix
      if (cleanRevenue.toUpperCase().endsWith('M')) {
        revenue = parseFloat(cleanRevenue.slice(0, -1));
      } else if (cleanRevenue.toUpperCase().endsWith('K')) {
        revenue = parseFloat(cleanRevenue.slice(0, -1)) / 1000; // Convert K to millions
      } else {
        revenue = parseFloat(cleanRevenue);
      }
    } else {
      revenue = revenue ? parseFloat(revenue) : null;
    }
    
    // Convert profit to number if it's a string
    profit = profit ? parseFloat(profit) : null;
    
    // Validate targetDate
    if (!targetDate) {
      return res.status(400).json({
        success: false,
        error: 'Target date is required'
      });
    }
    
    // Ensure the date is in YYYY-MM-DD format without timezone adjustments
    // This prevents timezone conversion issues with DATE columns
    if (targetDate.includes('T')) {
      targetDate = targetDate.split('T')[0];
    }
    
    // Get or create VTO - use department VTO if teamId is provided and not leadership
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
    
    // Handle revenue streams
    if (revenueStreams && Array.isArray(revenueStreams)) {
      // Delete existing revenue streams
      await query('DELETE FROM one_year_revenue_streams WHERE one_year_plan_id = $1', [planId]);
      
      // Insert new revenue streams
      for (let i = 0; i < revenueStreams.length; i++) {
        const stream = revenueStreams[i];
        if (stream.name && stream.revenue_target !== undefined) {
          await query(
            `INSERT INTO one_year_revenue_streams (id, one_year_plan_id, name, revenue_target, display_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), planId, stream.name, stream.revenue_target, i]
          );
        }
      }
    }
    
    // Handle goals - only update if goals array is provided
    // If goals is undefined, preserve existing goals
    if (goals !== undefined) {
      console.log('Backend - Processing goals, count:', goals ? goals.length : 0);
      
      if (Array.isArray(goals)) {
        // Get existing goals to preserve completion status
        const existingGoals = await query(
          'SELECT goal_text, is_completed FROM one_year_goals WHERE one_year_plan_id = $1',
          [planId]
        );
        
        // Create a map of existing goals to their completion status
        const completionMap = {};
        existingGoals.rows.forEach(goal => {
          completionMap[goal.goal_text] = goal.is_completed;
        });
        
        // Delete existing goals
        await query('DELETE FROM one_year_goals WHERE one_year_plan_id = $1', [planId]);
        
        // Insert new goals preserving completion status where text matches
        for (let i = 0; i < goals.length; i++) {
          const goal = goals[i];
          if (goal && goal.trim()) {
            const goalText = goal.trim();
            const isCompleted = completionMap[goalText] || false;
            
            console.log(`Backend - Inserting goal ${i}: ${goalText}`);
            await query(
              `INSERT INTO one_year_goals (id, one_year_plan_id, goal_text, sort_order, is_completed)
               VALUES ($1, $2, $3, $4, $5)`,
              [uuidv4(), planId, goalText, i, isCompleted]
            );
          }
        }
      }
    } else {
      console.log('Backend - Goals not provided, preserving existing goals');
    }
    
    // Handle measurables
    // Note: Currently the frontend sends measurables as a string, not an array
    // TODO: Update frontend to use array of measurables like 3-year picture
    if (measurables && typeof measurables === 'string') {
      // For backward compatibility, ignore string measurables for now
      // In the future, we should handle this properly
    } else if (measurables && Array.isArray(measurables)) {
      // Delete existing measurables
      await query('DELETE FROM one_year_measurables WHERE one_year_plan_id = $1', [planId]);
      
      // Insert new measurables
      for (let i = 0; i < measurables.length; i++) {
        const measurable = measurables[i];
        if (measurable.name || measurable.value) {
          await query(
            `INSERT INTO one_year_measurables (id, one_year_plan_id, name, target_value)
             VALUES ($1, $2, $3, $4)`,
            [uuidv4(), planId, measurable.name, measurable.value || '0']
          );
        }
      }
    }
    
    // Fetch the complete data with goals, measurables, and revenue streams
    const [completeGoals, completeMeasurables, completeRevenueStreams] = await Promise.all([
      query('SELECT * FROM one_year_goals WHERE one_year_plan_id = $1 ORDER BY sort_order', [planId]),
      query('SELECT * FROM one_year_measurables WHERE one_year_plan_id = $1', [planId]),
      query('SELECT * FROM one_year_revenue_streams WHERE one_year_plan_id = $1 ORDER BY display_order', [planId])
    ]);
    
    // Format the response to match what the frontend expects
    const responseData = {
      ...planResult.rows[0],
      goals: completeGoals.rows,
      measurables: completeMeasurables.rows,
      revenueStreams: completeRevenueStreams.rows
    };
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error updating one year plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while updating one year plan'
    });
  }
};

// Toggle completion status of a 1-year goal  
export const toggleOneYearGoalCompletion = async (req, res) => {
  const { goalId } = req.params;
  
  try {
    const result = await query(
      `UPDATE one_year_goals 
       SET is_completed = NOT is_completed,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, is_completed`,
      [goalId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling goal completion:', error);
    res.status(500).json({ error: 'Failed to toggle goal completion' });
  }
};

// Toggle completion status of a 3-year picture "what does it look like" item
export const toggleThreeYearItemCompletion = async (req, res) => {
  const { orgId, teamId } = req.params;
  const { itemIndex } = req.body;
  
  try {
    // Get the current VTO - check for team-specific or organization level
    let vtoResult;
    
    // Check if this team is a leadership team
    const teamResult = await query(
      'SELECT is_leadership_team FROM teams WHERE id = $1 AND organization_id = $2',
      [teamId, orgId]
    );
    
    const isLeadershipTeam = teamResult.rows.length > 0 && teamResult.rows[0].is_leadership_team;
    
    if (isLeadershipTeam) {
      // For leadership team, get organization-level VTO (team_id IS NULL)
      vtoResult = await query(
        'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id IS NULL',
        [orgId]
      );
    } else {
      // For department, get team-specific VTO
      vtoResult = await query(
        'SELECT id FROM business_blueprints WHERE organization_id = $1 AND team_id = $2',
        [orgId, teamId]
      );
    }
    
    if (vtoResult.rows.length === 0) {
      // If no VTO found and it's a leadership team, the error message should be clearer
      const vtoType = isLeadershipTeam ? 'organization-level' : 'team-specific';
      return res.status(404).json({ error: `No ${vtoType} VTO found` });
    }
    
    const vtoId = vtoResult.rows[0].id;
    
    // Get the three year picture
    const pictureResult = await query(
      'SELECT id, what_does_it_look_like_completions FROM three_year_pictures WHERE vto_id = $1',
      [vtoId]
    );
    
    if (pictureResult.rows.length === 0) {
      return res.status(404).json({ error: 'Three year picture not found' });
    }
    
    const pictureId = pictureResult.rows[0].id;
    const completions = pictureResult.rows[0].what_does_it_look_like_completions || {};
    
    // Toggle the completion status
    completions[itemIndex] = !completions[itemIndex];
    
    // Update the completions
    await query(
      `UPDATE three_year_pictures 
       SET what_does_it_look_like_completions = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(completions), pictureId]
    );
    
    res.json({ itemIndex, isCompleted: completions[itemIndex] });
  } catch (error) {
    console.error('Error toggling three year item completion:', error);
    res.status(500).json({ error: 'Failed to toggle item completion' });
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
  updateOneYearPlan,
  toggleOneYearGoalCompletion,
  toggleThreeYearItemCompletion
};