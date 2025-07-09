import db from '../config/database.js';
import logger from '../utils/logger.js';

// Get all departments for an organization
const getDepartments = async (req, res) => {
  try {
    const { organizationId } = req.user;

    // Get all departments with their leader info and member count
    const query = `
      WITH department_members AS (
        SELECT 
          d.id as department_id,
          COUNT(DISTINCT tm.user_id) as member_count
        FROM departments d
        LEFT JOIN teams t ON t.department_id = d.id
        LEFT JOIN team_members tm ON tm.team_id = t.id
        GROUP BY d.id
      )
      SELECT 
        d.id,
        d.name,
        d.description,
        d.leader_id,
        d.parent_department_id,
        d.created_at,
        d.updated_at,
        u.first_name || ' ' || u.last_name as leader_name,
        COALESCE(dm.member_count, 0) as member_count
      FROM departments d
      LEFT JOIN users u ON u.id = d.leader_id
      LEFT JOIN department_members dm ON dm.department_id = d.id
      WHERE d.organization_id = $1
      ORDER BY d.parent_department_id NULLS FIRST, d.name`;

    const { rows: departments } = await db.query(query, [organizationId]);

    // Build hierarchical structure
    const departmentMap = {};
    const rootDepartments = [];

    departments.forEach(dept => {
      departmentMap[dept.id] = {
        ...dept,
        subDepartments: []
      };
    });

    departments.forEach(dept => {
      if (dept.parent_department_id) {
        const parent = departmentMap[dept.parent_department_id];
        if (parent) {
          parent.subDepartments.push(departmentMap[dept.id]);
        }
      } else {
        rootDepartments.push(departmentMap[dept.id]);
      }
    });

    res.json(rootDepartments);
  } catch (error) {
    logger.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get single department with details
const getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const query = `
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as leader_name,
        (
          SELECT COUNT(DISTINCT tm.user_id)
          FROM teams t
          JOIN team_members tm ON tm.team_id = t.id
          WHERE t.department_id = d.id
        ) as member_count
      FROM departments d
      LEFT JOIN users u ON u.id = d.leader_id
      WHERE d.id = $1 AND d.organization_id = $2`;

    const { rows } = await db.query(query, [id, organizationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    logger.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
};

// Create new department
const createDepartment = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { name, description, leaderId, parentDepartmentId } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // Verify parent department belongs to same org if provided
    if (parentDepartmentId) {
      const parentCheck = await db.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [parentDepartmentId, organizationId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent department' });
      }
    }

    // Create department
    const query = `
      INSERT INTO departments (name, description, organization_id, leader_id, parent_department_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`;

    const values = [name, description, organizationId, leaderId || null, parentDepartmentId || null];
    const { rows } = await db.query(query, values);

    // Fetch with leader info
    const department = await getDepartmentWithDetails(rows[0].id, organizationId);
    
    res.status(201).json(department);
  } catch (error) {
    logger.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;
    const { name, description, leaderId, parentDepartmentId } = req.body;

    // Check department exists and belongs to org
    const existingCheck = await db.query(
      'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Prevent circular hierarchy
    if (parentDepartmentId === id) {
      return res.status(400).json({ error: 'Department cannot be its own parent' });
    }

    // Verify parent department if provided
    if (parentDepartmentId) {
      const parentCheck = await db.query(
        'SELECT id FROM departments WHERE id = $1 AND organization_id = $2',
        [parentDepartmentId, organizationId]
      );
      if (parentCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid parent department' });
      }
    }

    // Update department
    const query = `
      UPDATE departments 
      SET name = $1, description = $2, leader_id = $3, parent_department_id = $4, updated_at = NOW()
      WHERE id = $5 AND organization_id = $6
      RETURNING *`;

    const values = [name, description, leaderId || null, parentDepartmentId || null, id, organizationId];
    const { rows } = await db.query(query, values);

    // Fetch with leader info
    const department = await getDepartmentWithDetails(id, organizationId);
    
    res.json(department);
  } catch (error) {
    logger.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    // Check if department has sub-departments
    const subDeptCheck = await db.query(
      'SELECT COUNT(*) FROM departments WHERE parent_department_id = $1',
      [id]
    );
    if (parseInt(subDeptCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete department with sub-departments' });
    }

    // Check if department has teams
    const teamCheck = await db.query(
      'SELECT COUNT(*) FROM teams WHERE department_id = $1',
      [id]
    );
    if (parseInt(teamCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete department with teams' });
    }

    // Delete department
    const result = await db.query(
      'DELETE FROM departments WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    logger.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
};

// Helper function to get department with details
const getDepartmentWithDetails = async (departmentId, organizationId) => {
  const query = `
    SELECT 
      d.*,
      u.first_name || ' ' || u.last_name as leader_name,
      (
        SELECT COUNT(DISTINCT tm.user_id)
        FROM teams t
        JOIN team_members tm ON tm.team_id = t.id
        WHERE t.department_id = d.id
      ) as member_count
    FROM departments d
    LEFT JOIN users u ON u.id = d.leader_id
    WHERE d.id = $1 AND d.organization_id = $2`;

  const { rows } = await db.query(query, [departmentId, organizationId]);
  return rows[0];
};

export {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
};