import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get all organizational charts for an organization
// @route   GET /api/v1/organizations/:orgId/organizational-charts
// @access  Private
export const getOrganizationalCharts = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { includeShared } = req.query;
    const userId = req.user.id;

    // Verify access
    if (req.user.organizationId !== orgId && !req.user.isImpersonating) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    let chartsQuery = `
      SELECT 
        oc.id,
        oc.organization_id,
        oc.team_id,
        oc.department_id,
        oc.name,
        oc.description,
        oc.version,
        oc.is_template,
        oc.created_by,
        oc.created_at,
        oc.updated_at,
        u.first_name || ' ' || u.last_name as created_by_name,
        COUNT(DISTINCT p.id) as position_count
      FROM organizational_charts oc
      LEFT JOIN users u ON oc.created_by = u.id
      LEFT JOIN positions p ON p.chart_id = oc.id
      WHERE oc.organization_id = $1
      GROUP BY oc.id, oc.organization_id, oc.team_id, oc.department_id, 
               oc.name, oc.description, oc.version, oc.is_template, 
               oc.created_by, oc.created_at, oc.updated_at, u.first_name, u.last_name
    `;
    
    const queryParams = [orgId];

    // Include charts shared with this organization if requested
    if (includeShared === 'true') {
      chartsQuery = `
        ${chartsQuery}
        UNION
        SELECT 
          oc.id,
          oc.organization_id,
          oc.team_id,
          oc.department_id,
          oc.name,
          oc.description,
          oc.version,
          oc.is_template,
          oc.created_by,
          oc.created_at,
          oc.updated_at,
          u.first_name || ' ' || u.last_name as created_by_name,
          COUNT(DISTINCT p.id) as position_count
        FROM organizational_charts oc
        LEFT JOIN users u ON oc.created_by = u.id
        LEFT JOIN positions p ON p.chart_id = oc.id
        JOIN chart_sharing cs ON cs.chart_id = oc.id
        WHERE cs.shared_with_organization_id = $1
        GROUP BY oc.id, oc.organization_id, oc.team_id, oc.department_id, 
                 oc.name, oc.description, oc.version, oc.is_template, 
                 oc.created_by, oc.created_at, oc.updated_at, u.first_name, u.last_name
      `;
    }

    chartsQuery += ' ORDER BY updated_at DESC';

    const result = await query(chartsQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching organizational charts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizational charts'
    });
  }
};

// @desc    Get a specific organizational chart with all details
// @route   GET /api/v1/organizations/:orgId/organizational-charts/:chartId
// @access  Private
export const getOrganizationalChart = async (req, res) => {
  try {
    const { orgId, chartId } = req.params;
    const userId = req.user.id;

    // Get chart details
    const chartResult = await query(
      `SELECT oc.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM organizational_charts oc
       LEFT JOIN users u ON oc.created_by = u.id
       WHERE oc.id = $1 AND (oc.organization_id = $2 OR EXISTS (
         SELECT 1 FROM chart_sharing cs 
         WHERE cs.chart_id = oc.id 
         AND (cs.shared_with_organization_id = $2 OR cs.shared_with_user_id = $3)
       ))`,
      [chartId, orgId, userId]
    );

    if (chartResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organizational chart not found'
      });
    }

    const chart = chartResult.rows[0];

    // Get all positions with their holders
    const positionsResult = await query(
      `SELECT 
        p.*,
        ph.id as holder_id,
        ph.user_id as holder_user_id,
        ph.external_name,
        ph.external_email,
        ph.start_date,
        ph.is_primary,
        u.first_name,
        u.last_name,
        u.email as user_email
       FROM positions p
       LEFT JOIN position_holders ph ON ph.position_id = p.id AND ph.is_primary = true AND (ph.end_date IS NULL OR ph.end_date > CURRENT_DATE)
       LEFT JOIN users u ON ph.user_id = u.id
       WHERE p.chart_id = $1
       ORDER BY p.level, p.sort_order`,
      [chartId]
    );

    // Get skills for all positions
    const skillsResult = await query(
      `SELECT 
        ps.position_id,
        ps.importance_level,
        s.id as skill_id,
        s.name as skill_name,
        s.category
       FROM position_skills ps
       JOIN skills s ON ps.skill_id = s.id
       WHERE ps.position_id IN (SELECT id FROM positions WHERE chart_id = $1)`,
      [chartId]
    );

    // Get responsibilities for all positions
    const responsibilitiesResult = await query(
      `SELECT 
        position_id,
        responsibility,
        priority,
        sort_order
       FROM position_responsibilities
       WHERE position_id IN (SELECT id FROM positions WHERE chart_id = $1)
       ORDER BY sort_order`,
      [chartId]
    );

    // Group skills and responsibilities by position
    const skillsByPosition = {};
    const responsibilitiesByPosition = {};

    skillsResult.rows.forEach(skill => {
      if (!skillsByPosition[skill.position_id]) {
        skillsByPosition[skill.position_id] = [];
      }
      skillsByPosition[skill.position_id].push(skill);
    });

    responsibilitiesResult.rows.forEach(resp => {
      if (!responsibilitiesByPosition[resp.position_id]) {
        responsibilitiesByPosition[resp.position_id] = [];
      }
      responsibilitiesByPosition[resp.position_id].push(resp);
    });

    // Build position hierarchy
    const positionsMap = {};
    const rootPositions = [];

    positionsResult.rows.forEach(position => {
      const positionData = {
        ...position,
        skills: skillsByPosition[position.id] || [],
        responsibilities: responsibilitiesByPosition[position.id] || [],
        children: []
      };
      
      positionsMap[position.id] = positionData;
      
      if (!position.parent_position_id) {
        rootPositions.push(positionData);
      }
    });

    // Build tree structure
    Object.values(positionsMap).forEach(position => {
      if (position.parent_position_id && positionsMap[position.parent_position_id]) {
        positionsMap[position.parent_position_id].children.push(position);
      }
    });

    res.json({
      success: true,
      data: {
        chart,
        positions: rootPositions
      }
    });
  } catch (error) {
    console.error('Error fetching organizational chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organizational chart'
    });
  }
};

// @desc    Create a new organizational chart
// @route   POST /api/v1/organizations/:orgId/organizational-charts
// @access  Private (Admin or Manager)
export const createOrganizationalChart = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { orgId } = req.params;
    const { name, description, teamId, departmentId, isTemplate } = req.body;
    const userId = req.user.id;

    // Verify admin or manager role
    if (!['admin', 'manager'].includes(req.user.role) && !req.user.is_consultant) {
      await rollbackTransaction(client);
      return res.status(403).json({
        success: false,
        error: 'Only admins, managers, or consultants can create organizational charts'
      });
    }

    // Create the chart
    const chartId = uuidv4();
    const chartResult = await client.query(
      `INSERT INTO organizational_charts 
       (id, organization_id, team_id, department_id, name, description, is_template, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [chartId, orgId, teamId || null, departmentId || null, name, description, isTemplate || false, userId]
    );

    // Create initial history entry
    await client.query(
      `INSERT INTO chart_history (chart_id, version, change_type, change_description, changed_by)
       VALUES ($1, 1, 'created', 'Chart created', $2)`,
      [chartId, userId]
    );

    await commitTransaction(client);

    res.status(201).json({
      success: true,
      data: chartResult.rows[0]
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error creating organizational chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create organizational chart'
    });
  }
};

// @desc    Update organizational chart details
// @route   PUT /api/v1/organizations/:orgId/organizational-charts/:chartId
// @access  Private (Admin, Manager, or Editor)
export const updateOrganizationalChart = async (req, res) => {
  try {
    const { orgId, chartId } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    // Check permissions
    const permissionCheck = await query(
      `SELECT 
        CASE 
          WHEN oc.organization_id = $1 AND u.role IN ('admin', 'manager') THEN true
          WHEN cs.permission_level IN ('edit') THEN true
          ELSE false
        END as can_edit
       FROM organizational_charts oc
       LEFT JOIN chart_sharing cs ON cs.chart_id = oc.id AND cs.shared_with_user_id = $2
       LEFT JOIN users u ON u.id = $2
       WHERE oc.id = $3`,
      [orgId, userId, chartId]
    );

    if (permissionCheck.rows.length === 0 || !permissionCheck.rows[0].can_edit) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit this chart'
      });
    }

    const result = await query(
      `UPDATE organizational_charts 
       SET name = $1, description = $2, version = version + 1
       WHERE id = $3
       RETURNING *`,
      [name, description, chartId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating organizational chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update organizational chart'
    });
  }
};

// @desc    Delete organizational chart
// @route   DELETE /api/v1/organizations/:orgId/organizational-charts/:chartId
// @access  Private (Admin only)
export const deleteOrganizationalChart = async (req, res) => {
  try {
    const { orgId, chartId } = req.params;
    const userId = req.user.id;

    // Verify admin role
    if (req.user.role !== 'admin' && !req.user.is_consultant) {
      return res.status(403).json({
        success: false,
        error: 'Only admins or consultants can delete organizational charts'
      });
    }

    const result = await query(
      'DELETE FROM organizational_charts WHERE id = $1 AND organization_id = $2',
      [chartId, orgId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Organizational chart not found'
      });
    }

    res.json({
      success: true,
      message: 'Organizational chart deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting organizational chart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete organizational chart'
    });
  }
};

// @desc    Add a seat to the chart
// @route   POST /api/v1/organizations/:orgId/organizational-charts/:chartId/positions
// @access  Private (Admin, Manager, or Editor)
export const addPosition = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { chartId } = req.params;
    const { parentPositionId, title, positionType, skills, responsibilities } = req.body;
    const userId = req.user.id;

    // Calculate level based on parent
    let level = 0;
    if (parentPositionId) {
      const parentResult = await client.query(
        'SELECT level FROM positions WHERE id = $1',
        [parentPositionId]
      );
      if (parentResult.rows.length > 0) {
        level = parentResult.rows[0].level + 1;
      }
    }

    // Create position
    const positionId = uuidv4();
    const positionResult = await client.query(
      `INSERT INTO positions 
       (id, chart_id, parent_position_id, title, level, position_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [positionId, chartId, parentPositionId, title, level, positionType]
    );

    // Add skills if provided
    if (skills && skills.length > 0) {
      for (const skill of skills) {
        await client.query(
          `INSERT INTO position_skills (position_id, skill_id, importance_level)
           VALUES ($1, $2, $3)`,
          [positionId, skill.skillId, skill.importanceLevel]
        );
      }
    }

    // Add responsibilities if provided
    if (responsibilities && responsibilities.length > 0) {
      for (let i = 0; i < responsibilities.length; i++) {
        await client.query(
          `INSERT INTO position_responsibilities 
           (position_id, responsibility, priority, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [positionId, responsibilities[i].responsibility, responsibilities[i].priority, i]
        );
      }
    }

    // Update chart version and history
    await client.query(
      `UPDATE organizational_charts 
       SET version = version + 1 
       WHERE id = $1`,
      [chartId]
    );

    await client.query(
      `INSERT INTO chart_history 
       (chart_id, version, change_type, change_description, changed_by, change_data)
       VALUES ($1, (SELECT version FROM organizational_charts WHERE id = $1), 
               'position_added', $2, $3, $4)`,
      [chartId, `Added seat: ${title}`, userId, JSON.stringify({ positionId, title })]
    );

    await commitTransaction(client);

    res.status(201).json({
      success: true,
      data: positionResult.rows[0]
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error adding seat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add seat'
    });
  }
};

// @desc    Update a seat
// @route   PUT /api/v1/organizations/:orgId/organizational-charts/:chartId/positions/:positionId
// @access  Private (Admin, Manager, or Editor)
export const updatePosition = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { chartId, positionId } = req.params;
    const { title, positionType, responsibilities, skills } = req.body;
    const userId = req.user.id;

    const result = await client.query(
      `UPDATE positions 
       SET title = $1, position_type = $2
       WHERE id = $3 AND chart_id = $4
       RETURNING *`,
      [title, positionType, positionId, chartId]
    );

    if (result.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({
        success: false,
        error: 'Seat not found'
      });
    }

    // Update responsibilities if provided
    if (responsibilities !== undefined) {
      // Delete existing responsibilities
      await client.query(
        'DELETE FROM position_responsibilities WHERE position_id = $1',
        [positionId]
      );

      // Add new responsibilities
      if (responsibilities && responsibilities.length > 0) {
        for (let i = 0; i < responsibilities.length; i++) {
          await client.query(
            `INSERT INTO position_responsibilities 
             (position_id, responsibility, priority, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [positionId, responsibilities[i].responsibility, 
             responsibilities[i].priority || 'medium', 
             responsibilities[i].sort_order || i]
          );
        }
      }
    }

    // Update skills if provided
    if (skills !== undefined) {
      // Delete existing skills
      await client.query(
        'DELETE FROM position_skills WHERE position_id = $1',
        [positionId]
      );

      // Add new skills
      if (skills && skills.length > 0) {
        for (const skill of skills) {
          await client.query(
            `INSERT INTO position_skills (position_id, skill_id, importance_level)
             VALUES ($1, $2, $3)`,
            [positionId, skill.skillId, skill.importanceLevel]
          );
        }
      }
    }

    // Update chart version and history
    await client.query(
      `UPDATE organizational_charts 
       SET version = version + 1 
       WHERE id = $1`,
      [chartId]
    );

    await client.query(
      `INSERT INTO chart_history 
       (chart_id, version, change_type, change_description, changed_by, change_data)
       VALUES ($1, (SELECT version FROM organizational_charts WHERE id = $1), 
               'position_updated', $2, $3, $4)`,
      [chartId, `Updated seat: ${title}`, userId, JSON.stringify({ positionId, title })]
    );

    await commitTransaction(client);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error updating seat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update seat'
    });
  }
};

// @desc    Delete a seat
// @route   DELETE /api/v1/organizations/:orgId/organizational-charts/:chartId/positions/:positionId
// @access  Private (Admin, Manager, or Editor)
export const deletePosition = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { chartId, positionId } = req.params;
    const userId = req.user.id;

    // Get position details for history
    const positionResult = await client.query(
      'SELECT title FROM positions WHERE id = $1',
      [positionId]
    );

    if (positionResult.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({
        success: false,
        error: 'Seat not found'
      });
    }

    const positionTitle = positionResult.rows[0].title;

    // Delete position (cascades to holders, skills, responsibilities)
    await client.query(
      'DELETE FROM positions WHERE id = $1 AND chart_id = $2',
      [positionId, chartId]
    );

    // Update chart version and history
    await client.query(
      `UPDATE organizational_charts 
       SET version = version + 1 
       WHERE id = $1`,
      [chartId]
    );

    await client.query(
      `INSERT INTO chart_history 
       (chart_id, version, change_type, change_description, changed_by, change_data)
       VALUES ($1, (SELECT version FROM organizational_charts WHERE id = $1), 
               'position_removed', $2, $3, $4)`,
      [chartId, `Removed seat: ${positionTitle}`, userId, JSON.stringify({ positionId, title: positionTitle })]
    );

    await commitTransaction(client);

    res.json({
      success: true,
      message: 'Seat deleted successfully'
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error deleting seat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete seat'
    });
  }
};

// @desc    Assign a person to a seat
// @route   POST /api/v1/organizations/:orgId/organizational-charts/:chartId/positions/:positionId/assign
// @access  Private (Admin, Manager, or Editor)
export const assignPositionHolder = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { chartId, positionId } = req.params;
    const { userId: assignedUserId, externalName, externalEmail, startDate } = req.body;
    const userId = req.user.id;

    // Remove current primary holder if exists
    await client.query(
      `UPDATE position_holders 
       SET is_primary = false, end_date = CURRENT_DATE
       WHERE position_id = $1 AND is_primary = true AND end_date IS NULL`,
      [positionId]
    );

    // Create new holder
    const holderId = uuidv4();
    const holderResult = await client.query(
      `INSERT INTO position_holders 
       (id, position_id, user_id, external_name, external_email, start_date, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [holderId, positionId, assignedUserId || null, externalName, externalEmail, startDate || new Date()]
    );

    // Update chart version and history
    await client.query(
      `UPDATE organizational_charts 
       SET version = version + 1 
       WHERE id = $1`,
      [chartId]
    );

    const holderName = assignedUserId ? 
      (await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [assignedUserId])).rows[0] :
      { first_name: externalName, last_name: '' };

    await client.query(
      `INSERT INTO chart_history 
       (chart_id, version, change_type, change_description, changed_by, change_data)
       VALUES ($1, (SELECT version FROM organizational_charts WHERE id = $1), 
               'holder_changed', $2, $3, $4)`,
      [chartId, `Assigned ${holderName.first_name} ${holderName.last_name} to seat`, userId, 
       JSON.stringify({ positionId, holderId, name: `${holderName.first_name} ${holderName.last_name}` })]
    );

    await commitTransaction(client);

    res.status(201).json({
      success: true,
      data: holderResult.rows[0]
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error assigning seat holder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign seat holder'
    });
  }
};

// @desc    Remove a person from a seat
// @route   DELETE /api/v1/organizations/:orgId/organizational-charts/:chartId/positions/:positionId/holder
// @access  Private (Admin, Manager, or Editor)
export const removePositionHolder = async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const { chartId, positionId } = req.params;
    const userId = req.user.id;

    const result = await client.query(
      `UPDATE position_holders 
       SET end_date = CURRENT_DATE, is_primary = false
       WHERE position_id = $1 AND is_primary = true AND end_date IS NULL
       RETURNING *`,
      [positionId]
    );

    if (result.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({
        success: false,
        error: 'No active holder found for this seat'
      });
    }

    // Update chart version and history
    await client.query(
      `UPDATE organizational_charts 
       SET version = version + 1 
       WHERE id = $1`,
      [chartId]
    );

    await client.query(
      `INSERT INTO chart_history 
       (chart_id, version, change_type, change_description, changed_by, change_data)
       VALUES ($1, (SELECT version FROM organizational_charts WHERE id = $1), 
               'holder_changed', 'Removed seat holder', $2, $3)`,
      [chartId, userId, JSON.stringify({ positionId })]
    );

    await commitTransaction(client);

    res.json({
      success: true,
      message: 'Seat holder removed successfully'
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error removing seat holder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove seat holder'
    });
  }
};

export default {
  getOrganizationalCharts,
  getOrganizationalChart,
  createOrganizationalChart,
  updateOrganizationalChart,
  deleteOrganizationalChart,
  addPosition,
  updatePosition,
  deletePosition,
  assignPositionHolder,
  removePositionHolder
};