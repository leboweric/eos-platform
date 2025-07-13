import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get all todos for an organization
// @route   GET /api/v1/organizations/:orgId/todos
// @access  Private
export const getTodos = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { status, assignedTo, includeCompleted } = req.query;
    const userId = req.user.id;

    // Build query conditions
    let conditions = ['t.organization_id = $1'];
    let params = [orgId];
    let paramIndex = 2;

    // Filter by status
    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    } else if (!includeCompleted || includeCompleted === 'false') {
      conditions.push(`t.status = 'incomplete'`);
    }

    // Filter by assigned to
    if (assignedTo) {
      conditions.push(`t.assigned_to_id = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex++;
    }

    // Get todos with owner and assignee information
    const todosResult = await query(
      `SELECT 
        t.*,
        owner.id as owner_id,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.email as owner_email,
        assignee.id as assignee_id,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name,
        assignee.email as assignee_email,
        (SELECT COUNT(*) FROM todo_attachments WHERE todo_id = t.id) as attachment_count,
        (SELECT COUNT(*) FROM todo_comments WHERE todo_id = t.id) as comment_count
      FROM todos t
      LEFT JOIN users owner ON t.owner_id = owner.id
      LEFT JOIN users assignee ON t.assigned_to_id = assignee.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC`,
      params
    );

    // Get team members for the dropdown
    const teamMembersResult = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email
       FROM users u
       WHERE u.organization_id = $1
       ORDER BY u.first_name, u.last_name`,
      [orgId]
    );

    res.json({
      success: true,
      data: {
        todos: todosResult.rows,
        teamMembers: teamMembersResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch todos'
    });
  }
};

// @desc    Create a new todo
// @route   POST /api/v1/organizations/:orgId/todos
// @access  Private
export const createTodo = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { title, description, assignedToId, dueDate, teamId } = req.body;
    const userId = req.user.id;

    // Calculate default due date (7 days from now) if not provided
    const finalDueDate = dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todoId = uuidv4();
    const result = await query(
      `INSERT INTO todos (
        id, organization_id, team_id, owner_id, assigned_to_id, 
        title, description, due_date, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        todoId, orgId, teamId || null, userId, assignedToId || userId,
        title, description, finalDueDate, 'medium', 'incomplete'
      ]
    );

    // Fetch the complete todo with user information
    const todoResult = await query(
      `SELECT 
        t.*,
        owner.id as owner_id,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.email as owner_email,
        assignee.id as assignee_id,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name,
        assignee.email as assignee_email
      FROM todos t
      LEFT JOIN users owner ON t.owner_id = owner.id
      LEFT JOIN users assignee ON t.assigned_to_id = assignee.id
      WHERE t.id = $1`,
      [todoId]
    );

    res.status(201).json({
      success: true,
      data: todoResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create todo'
    });
  }
};

// @desc    Update a todo
// @route   PUT /api/v1/organizations/:orgId/todos/:todoId
// @access  Private
export const updateTodo = async (req, res) => {
  try {
    const { orgId, todoId } = req.params;
    const { title, description, assignedToId, dueDate, status } = req.body;
    const userId = req.user.id;

    // Check if todo exists and belongs to the organization
    const existingTodo = await query(
      'SELECT * FROM todos WHERE id = $1 AND organization_id = $2',
      [todoId, orgId]
    );

    if (existingTodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (assignedToId !== undefined) {
      updates.push(`assigned_to_id = $${paramIndex}`);
      values.push(assignedToId);
      paramIndex++;
    }

    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(dueDate);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
      
      // Set completed_at if marking as complete
      if (status === 'complete') {
        updates.push(`completed_at = NOW()`);
      } else if (status === 'incomplete') {
        updates.push(`completed_at = NULL`);
      }
    }

    updates.push(`updated_at = NOW()`);

    // Add the where clause parameters
    values.push(todoId, orgId);

    const result = await query(
      `UPDATE todos 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    // Fetch the complete todo with user information
    const todoResult = await query(
      `SELECT 
        t.*,
        owner.id as owner_id,
        owner.first_name as owner_first_name,
        owner.last_name as owner_last_name,
        owner.email as owner_email,
        assignee.id as assignee_id,
        assignee.first_name as assignee_first_name,
        assignee.last_name as assignee_last_name,
        assignee.email as assignee_email,
        0 as attachment_count
      FROM todos t
      LEFT JOIN users owner ON t.owner_id = owner.id
      LEFT JOIN users assignee ON t.assigned_to_id = assignee.id
      WHERE t.id = $1`,
      [todoId]
    );

    res.json({
      success: true,
      data: todoResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update todo'
    });
  }
};

// @desc    Delete a todo
// @route   DELETE /api/v1/organizations/:orgId/todos/:todoId
// @access  Private
export const deleteTodo = async (req, res) => {
  try {
    const { orgId, todoId } = req.params;
    const userId = req.user.id;

    const result = await query(
      'DELETE FROM todos WHERE id = $1 AND organization_id = $2 RETURNING id',
      [todoId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    res.json({
      success: true,
      data: { id: todoId }
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete todo'
    });
  }
};

// @desc    Upload attachment for a todo
// @route   POST /api/v1/organizations/:orgId/todos/:todoId/attachments
// @access  Private
export const uploadTodoAttachment = async (req, res) => {
  try {
    const { orgId, todoId } = req.params;
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Verify todo exists and belongs to organization
    const todoCheck = await query(
      'SELECT id FROM todos WHERE id = $1 AND organization_id = $2',
      [todoId, orgId]
    );

    if (todoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    // Insert attachment record
    const attachmentId = uuidv4();
    const result = await query(
      `INSERT INTO todo_attachments (
        id, todo_id, file_name, file_path, file_size, mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        attachmentId,
        todoId,
        file.originalname,
        file.path,
        file.size,
        file.mimetype,
        userId
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload attachment'
    });
  }
};

// @desc    Get attachments for a todo
// @route   GET /api/v1/organizations/:orgId/todos/:todoId/attachments
// @access  Private
export const getTodoAttachments = async (req, res) => {
  try {
    const { orgId, todoId } = req.params;

    const result = await query(
      `SELECT a.*, u.first_name, u.last_name, u.email
       FROM todo_attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.todo_id = $1
       ORDER BY a.created_at DESC`,
      [todoId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachments'
    });
  }
};

// @desc    Delete an attachment
// @route   DELETE /api/v1/organizations/:orgId/todos/:todoId/attachments/:attachmentId
// @access  Private
export const deleteTodoAttachment = async (req, res) => {
  try {
    const { orgId, todoId, attachmentId } = req.params;
    const userId = req.user.id;

    // Delete the attachment record
    const result = await query(
      `DELETE FROM todo_attachments 
       WHERE id = $1 AND todo_id = $2 
       RETURNING file_path`,
      [attachmentId, todoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // TODO: Delete the actual file from storage
    // This would depend on your storage solution (local, S3, etc.)

    res.json({
      success: true,
      data: { id: attachmentId }
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attachment'
    });
  }
};

export default {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  uploadTodoAttachment,
  getTodoAttachments,
  deleteTodoAttachment
};