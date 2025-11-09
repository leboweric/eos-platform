import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getUserTeamContext, getUserTeamScope } from '../utils/teamUtils.js';
import { getDateDaysFromNow } from '../utils/dateUtils.js';
import meetingSocketService from '../services/meetingSocketService.js';

// @desc    Get all todos for an organization
// @route   GET /api/v1/organizations/:orgId/todos
// @access  Private
export const getTodos = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { status, assignedTo, includeCompleted, department_id } = req.query;
    const userId = req.user.id;

    // Get user's team context
    const userTeam = await getUserTeamContext(userId, orgId);
    // User team context debug - removed for production performance

    // Build query conditions
    let conditions = ['t.organization_id = $1', 't.deleted_at IS NULL'];
    let params = [orgId];
    let paramIndex = 2;

    // Filter by archived status - by default, exclude archived
    const includeArchived = req.query.includeArchived === 'true';
    if (!includeArchived) {
      conditions.push(`(t.archived = false OR t.archived IS NULL)`);
    }

    // Filter by status
    if (status) {
      conditions.push(`t.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    } else if (!includeCompleted || includeCompleted === 'false') {
      // Don't filter by status anymore - show both complete and incomplete
      // conditions.push(`t.status = 'incomplete'`);
    }

    // Filter by assigned to
    if (assignedTo) {
      conditions.push(`t.assigned_to_id = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex++;
    }
    
    // =====================================================================
    // MANDATORY TEAM ISOLATION
    // =====================================================================
    const teamScope = await getUserTeamScope(userId, orgId, 't', department_id, paramIndex); // Use 't' as the alias for the todos table
    conditions.push(`(${teamScope.query})`);
    if (teamScope.params.length > 0) {
      params.push(teamScope.params[0]); // CORRECTED LINE
      paramIndex++;
    }
    // =====================================================================

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
        tm.name as team_name,
        (SELECT COUNT(*) FROM todo_attachments WHERE todo_id = t.id) as attachment_count,
        (SELECT COUNT(*) FROM todo_comments WHERE todo_id = t.id) as comment_count
      FROM todos t
      LEFT JOIN users owner ON t.owner_id = owner.id
      LEFT JOIN users assignee ON t.assigned_to_id = assignee.id
      LEFT JOIN teams tm ON t.team_id = tm.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.due_date ASC, t.priority DESC, t.created_at DESC`,
      params
    );

    console.log('Todos query conditions:', conditions.join(' AND '));
    console.log('Todos query params:', params);
    console.log(`Found ${todosResult.rows.length} todos for org ${orgId}`);
    
    // Fetch multi-assignees for todos that have them
    const multiAssigneeTodoIds = todosResult.rows
      .filter(todo => todo.is_multi_assignee)
      .map(todo => todo.id);
    
    let multiAssigneesMap = {};
    if (multiAssigneeTodoIds.length > 0) {
      const multiAssigneesResult = await query(
        `SELECT ta.todo_id, u.id, u.first_name, u.last_name, u.email,
                ta.completed, ta.completed_at, ta.archived, ta.archived_at
         FROM todo_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.todo_id = ANY($1)
         AND (ta.archived = false OR ta.archived IS NULL)`,
        [multiAssigneeTodoIds]
      );
      
      // Group assignees by todo_id
      multiAssigneesResult.rows.forEach(row => {
        if (!multiAssigneesMap[row.todo_id]) {
          multiAssigneesMap[row.todo_id] = [];
        }
        multiAssigneesMap[row.todo_id].push({
          id: row.id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          completed: row.completed,
          completed_at: row.completed_at,
          archived: row.archived,
          archived_at: row.archived_at
        });
      });
    }

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
        todos: todosResult.rows.map(todo => ({
          ...todo,
          teamName: todo.team_name,
          assigned_to: todo.assignee_id ? {
            id: todo.assignee_id,
            first_name: todo.assignee_first_name,
            last_name: todo.assignee_last_name,
            email: todo.assignee_email
          } : null,
          assignees: multiAssigneesMap[todo.id] || [] // Add multi-assignees
        })),
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
    const { title, description, assignedToId, assignedToIds, dueDate, teamId, priority, relatedPriorityId, meeting_id } = req.body;
    const userId = req.user.id;

    // Calculate default due date (7 days from now) if not provided
    const finalDueDate = dueDate || getDateDaysFromNow(7);

    const todoId = uuidv4();
    
    // Handle multi-assignees
    const isMultiAssignee = assignedToIds && assignedToIds.length > 0;
    const singleAssignee = isMultiAssignee ? null : (assignedToId || userId);
    
    const result = await query(
      `INSERT INTO todos (
        id, organization_id, team_id, owner_id, assigned_to_id, 
        title, description, due_date, priority, status, is_multi_assignee, related_priority_id, meeting_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        todoId, orgId, teamId || null, userId, singleAssignee,
        title, description, finalDueDate, priority || 'medium', 'incomplete', isMultiAssignee, relatedPriorityId || null, meeting_id || null
      ]
    );
    
    // If multi-assignee, insert into junction table
    if (isMultiAssignee && assignedToIds.length > 0) {
      const assigneeValues = assignedToIds.map((assigneeId, index) => 
        `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
      ).join(', ');
      
      const assigneeParams = assignedToIds.flatMap(assigneeId => 
        [todoId, assigneeId, userId]
      );
      
      await query(
        `INSERT INTO todo_assignees (todo_id, user_id, assigned_by) 
         VALUES ${assigneeValues}`,
        assigneeParams
      );
    }

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
    
    // If multi-assignee, fetch all assignees
    let multiAssignees = [];
    if (isMultiAssignee) {
      const assigneesResult = await query(
        `SELECT u.id, u.first_name, u.last_name, u.email
         FROM todo_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.todo_id = $1`,
        [todoId]
      );
      multiAssignees = assigneesResult.rows;
    }

    const todo = todoResult.rows[0];

    // Broadcast to meeting participants if created during a meeting
    try {
      if (meeting_id && meetingSocketService) {
        await meetingSocketService.broadcastToMeetingById(meeting_id, 'todo-created', {
          todo: todo,
          createdBy: req.user.first_name + ' ' + req.user.last_name
        });
      }
    } catch (broadcastError) {
      console.error('Failed to broadcast todo-created:', broadcastError.message);
    }

    res.status(201).json({
      success: true,
      data: {
        ...todo,
        assigned_to: todo.assignee_id ? {
          id: todo.assignee_id,
          first_name: todo.assignee_first_name,
          last_name: todo.assignee_last_name,
          email: todo.assignee_email
        } : null,
        assignees: multiAssignees // New field for multi-assignees
      }
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
    const { title, description, assignedToId, assignedToIds, dueDate, status, assigneeId } = req.body;
    const userId = req.user.id;
    
    console.log('🔥🔥🔥 UPDATE TODO REQUEST 🔥🔥🔥');
    console.log('📦 Full request body:', JSON.stringify(req.body, null, 2));
    console.log('🆔 Todo ID:', todoId);
    console.log('👤 Current user ID:', userId);
    console.log('🎯 Assignee ID from request:', assigneeId);
    console.log('📊 Status from request:', status);

    // Check if todo exists and belongs to the organization
    const existingTodo = await query(
      'SELECT * FROM todos WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
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

    // Handle assignee updates
    const isMultiAssignee = assignedToIds !== undefined && assignedToIds.length > 0;
    
    if (Array.isArray(assignedToIds) && assignedToIds.length > 0) {
      // Switching to multi-assignee mode
      updates.push(`assigned_to_id = NULL`);
      updates.push(`is_multi_assignee = TRUE`);
      
      // We'll handle the junction table after the main update
    } else if (assignedToId !== undefined && assignedToId !== null && assignedToId !== '') {
      // Single assignee mode
      updates.push(`assigned_to_id = $${paramIndex}`);
      values.push(assignedToId);
      paramIndex++;
      updates.push(`is_multi_assignee = FALSE`);
    }

    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(dueDate);
      paramIndex++;
    }

    // Handle status updates differently for multi-assignee todos
    const currentTodo = existingTodo.rows[0];
    const isCurrentlyMultiAssignee = currentTodo.is_multi_assignee;
    
    if (status !== undefined && isCurrentlyMultiAssignee) {
      // For multi-assignee todos, update individual assignee completion
      // Don't update the main todo status here - it will be calculated after
      console.log(`Multi-assignee todo ${todoId}: User ${userId} marking as ${status}`);
      
      // For multi-assignee todos, use the assigneeId from the request (which assignee's copy to mark)
      // This allows facilitators to mark specific assignees' copies as complete
      const targetUserId = assigneeId || userId; // Use assigneeId if provided, otherwise current user
      
      console.log(`🔍 Target assignee ID: ${targetUserId} (provided: ${assigneeId}, current user: ${userId})`);
      
      // Debug: Check what assignees exist for this todo
      const existingAssignees = await query(
        `SELECT user_id, completed FROM todo_assignees WHERE todo_id = $1`,
        [todoId]
      );
      console.log(`🔍 Existing assignees for todo:`, existingAssignees.rows);
      
      if (status === 'complete') {
        // Mark the target assignee's copy as complete
        console.log('🛠️ EXECUTING UPDATE QUERY:');
        console.log('   SQL: UPDATE todo_assignees SET completed = TRUE, completed_at = NOW() WHERE todo_id = $1 AND user_id = $2');
        console.log('   Params: [', todoId, ',', targetUserId, ']');
        
        const updateResult = await query(
          `UPDATE todo_assignees 
           SET completed = TRUE, completed_at = NOW() 
           WHERE todo_id = $1 AND user_id = $2`,
          [todoId, targetUserId]
        );
        console.log(`✅ Updated assignee completion: ${updateResult.rowCount} rows affected`);
        
        if (updateResult.rowCount === 0) {
          console.log('❌❌❌ UPDATE FAILED - NO ROWS AFFECTED ❌❌❌');
          console.log('   This means the WHERE clause did not match any rows');
          console.log('   Either todo_id or user_id does not exist in todo_assignees table');
        }
      } else if (status === 'incomplete') {
        // Unmark the target assignee's copy
        console.log('🛠️ EXECUTING UPDATE QUERY:');
        console.log('   SQL: UPDATE todo_assignees SET completed = FALSE, completed_at = NULL WHERE todo_id = $1 AND user_id = $2');
        console.log('   Params: [', todoId, ',', targetUserId, ']');
        
        const updateResult = await query(
          `UPDATE todo_assignees 
           SET completed = FALSE, completed_at = NULL 
           WHERE todo_id = $1 AND user_id = $2`,
          [todoId, targetUserId]
        );
        console.log(`✅ Updated assignee completion: ${updateResult.rowCount} rows affected`);
        
        if (updateResult.rowCount === 0) {
          console.log('❌❌❌ UPDATE FAILED - NO ROWS AFFECTED ❌❌❌');
          console.log('   This means the WHERE clause did not match any rows');
          console.log('   Either todo_id or user_id does not exist in todo_assignees table');
        }
      }
      
      // For multi-assignee todos, each assignee's copy is independent
      // Don't update the main todo status - it's not used
      // Each assignee's completion is tracked in todo_assignees.completed
      console.log('✅ Multi-assignee todo: Individual assignee status updated, main status unchanged');
    } else if (status !== undefined) {
      // Single assignee todo - original behavior
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

    // Add support for issue_created field
    if (req.body.issue_created !== undefined) {
      updates.push(`issue_created = $${paramIndex}`);
      values.push(req.body.issue_created);
      paramIndex++;
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
    
    // Handle multi-assignee updates
    if (isMultiAssignee) {
      console.log('🔄 Handling multi-assignee update');
      console.log('   assignedToIds:', assignedToIds);
      
      // Clear existing assignees
      const deleteResult = await query('DELETE FROM todo_assignees WHERE todo_id = $1', [todoId]);
      console.log(`🗑️ Deleted ${deleteResult.rowCount} existing assignees`);
      
      // Add new assignees
      if (assignedToIds && assignedToIds.length > 0) {
        const assigneeValues = assignedToIds.map((assigneeId, index) => 
          `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5})`
        ).join(', ');
        
        const assigneeParams = assignedToIds.flatMap(assigneeId => 
          [todoId, assigneeId, userId, false, null]  // Explicitly set completed=false, completed_at=null
        );
        
        console.log('📝 Inserting assignees:');
        console.log('   SQL: INSERT INTO todo_assignees (todo_id, user_id, assigned_by, completed, completed_at) VALUES ...');
        console.log('   Assignee IDs:', assignedToIds);
        
        const insertResult = await query(
          `INSERT INTO todo_assignees (todo_id, user_id, assigned_by, completed, completed_at) 
           VALUES ${assigneeValues}`,
          assigneeParams
        );
        console.log(`✅ Inserted ${insertResult.rowCount} assignees`);
      }
    }

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

    // Fetch multi-assignees if applicable
    let multiAssignees = [];
    if (result.rows[0]?.is_multi_assignee) {
      const assigneesResult = await query(
        `SELECT u.id, u.first_name, u.last_name, u.email, 
                ta.completed, ta.completed_at
         FROM todo_assignees ta
         JOIN users u ON ta.user_id = u.id
         WHERE ta.todo_id = $1`,
        [todoId]
      );
      multiAssignees = assigneesResult.rows;
    }
    
    const todo = todoResult.rows[0];
    res.json({
      success: true,
      data: {
        ...todo,
        assigned_to: todo.assignee_id ? {
          id: todo.assignee_id,
          first_name: todo.assignee_first_name,
          last_name: todo.assignee_last_name,
          email: todo.assignee_email
        } : null,
        assignees: multiAssignees
      }
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
      'UPDATE todos SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL RETURNING id',
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
      'SELECT id FROM todos WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
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

// @desc    Download an attachment
// @route   GET /api/v1/organizations/:orgId/todos/:todoId/attachments/:attachmentId/download
// @access  Private
export const downloadTodoAttachment = async (req, res) => {
  try {
    const { orgId, todoId, attachmentId } = req.params;

    // Get attachment details
    const result = await query(
      `SELECT a.*, t.organization_id
       FROM todo_attachments a
       JOIN todos t ON a.todo_id = t.id
       WHERE a.id = $1 AND a.todo_id = $2 AND t.organization_id = $3`,
      [attachmentId, todoId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    const attachment = result.rows[0];
    const filePath = path.resolve(attachment.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).json({
        success: false,
        error: 'File not found on server',
        path: process.env.NODE_ENV === 'development' ? filePath : undefined
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    res.setHeader('Content-Length', attachment.file_size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download attachment'
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

    // Delete the actual file from storage
    const filePath = path.resolve(result.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

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

// @desc    Archive done todos
// @route   PUT /api/v1/organizations/:orgId/todos/archive-done
// @access  Private
export const archiveDoneTodos = async (req, res) => {
  try {
    const { orgId } = req.params;
    const userId = req.user.id;

    // Archive completed todos
    // For single-assignee todos: archive the main todo
    const singleAssigneeResult = await query(
      `UPDATE todos 
       SET archived = true, updated_at = NOW()
       WHERE organization_id = $1 
       AND (archived = false OR archived IS NULL)
       AND is_multi_assignee = false 
       AND status = 'complete'
       RETURNING id`,
      [orgId]
    );
    
    // For multi-assignee todos: archive individual completed copies
    const multiAssigneeResult = await query(
      `UPDATE todo_assignees 
       SET archived = true, archived_at = NOW()
       WHERE todo_id IN (
         SELECT id FROM todos WHERE organization_id = $1 AND is_multi_assignee = true
       )
       AND completed = true
       AND (archived = false OR archived IS NULL)
       RETURNING id`,
      [orgId]
    );
    
    const totalArchived = singleAssigneeResult.rows.length + multiAssigneeResult.rows.length;
    console.log(`📦 Archived ${singleAssigneeResult.rows.length} single-assignee todos and ${multiAssigneeResult.rows.length} multi-assignee copies`);

    res.json({
      success: true,
      data: {
        archivedCount: totalArchived
      }
    });
  } catch (error) {
    console.error('Error archiving done todos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive done todos'
    });
  }
};

// @desc    Unarchive a specific todo
// @route   PUT /api/v1/organizations/:orgId/todos/:todoId/unarchive
// @access  Private
export const unarchiveTodo = async (req, res) => {
  try {
    const { orgId, todoId } = req.params;
    const userId = req.user.id;

    // First check if the todo exists and belongs to the organization
    const existingTodo = await query(
      `SELECT id, title, archived 
       FROM todos 
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [todoId, orgId]
    );

    if (existingTodo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found'
      });
    }

    if (!existingTodo.rows[0].archived) {
      return res.status(400).json({
        success: false,
        error: 'Todo is not archived'
      });
    }

    // Unarchive the todo
    const result = await query(
      `UPDATE todos 
       SET archived = false, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING id, title, archived`,
      [todoId, orgId]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Unarchive todo error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unarchive todo'
    });
  }
};

// @desc    Get updates for a todo
// @route   GET /api/v1/todos/:todoId/updates
// @access  Private
export const getTodoUpdates = async (req, res) => {
  try {
    const { todoId } = req.params;
    
    const result = await query(
      `SELECT 
        tu.id,
        tu.update_text,
        tu.created_at,
        tu.created_by,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM todo_updates tu
       JOIN users u ON tu.created_by = u.id
       WHERE tu.todo_id = $1
       ORDER BY tu.created_at DESC`,
      [todoId]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching todo updates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo updates'
    });
  }
};

// @desc    Add update to a todo
// @route   POST /api/v1/todos/:todoId/updates
// @access  Private
export const addTodoUpdate = async (req, res) => {
  try {
    const { todoId } = req.params;
    const { update_text } = req.body;
    const userId = req.user.id;
    
    if (!update_text || !update_text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Update text is required'
      });
    }
    
    const result = await query(
      `INSERT INTO todo_updates (todo_id, update_text, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, update_text, created_at`,
      [todoId, update_text.trim(), userId]
    );
    
    // Get the created update with user info
    const updateWithUser = await query(
      `SELECT 
        tu.id,
        tu.update_text,
        tu.created_at,
        tu.created_by,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM todo_updates tu
       JOIN users u ON tu.created_by = u.id
       WHERE tu.id = $1`,
      [result.rows[0].id]
    );
    
    res.json({
      success: true,
      data: updateWithUser.rows[0]
    });
  } catch (error) {
    console.error('Error adding todo update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add todo update'
    });
  }
};

// @desc    Delete a todo update
// @route   DELETE /api/v1/todos/:todoId/updates/:updateId
// @access  Private
export const deleteTodoUpdate = async (req, res) => {
  try {
    const { todoId, updateId } = req.params;
    const userId = req.user.id;
    
    // Check if user owns the update or is an admin
    const updateCheck = await query(
      `SELECT created_by FROM todo_updates WHERE id = $1 AND todo_id = $2`,
      [updateId, todoId]
    );
    
    if (updateCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }
    
    const isOwner = updateCheck.rows[0].created_by === userId;
    const isAdmin = req.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own updates'
      });
    }
    
    await query(
      `DELETE FROM todo_updates WHERE id = $1 AND todo_id = $2`,
      [updateId, todoId]
    );
    
    res.json({
      success: true,
      message: 'Update deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting todo update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo update'
    });
  }
};

export default {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  archiveDoneTodos,
  unarchiveTodo,
  uploadTodoAttachment,
  getTodoAttachments,
  downloadTodoAttachment,
  deleteTodoAttachment,
  getTodoUpdates,
  addTodoUpdate,
  deleteTodoUpdate
};