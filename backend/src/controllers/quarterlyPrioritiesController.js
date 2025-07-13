import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { isUserOnLeadershipTeam } from './teamsController.js';

// Check if a column exists in quarterly_priorities table
async function checkColumn(columnName) {
  try {
    const result = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = 'quarterly_priorities' 
       AND column_name = $1`,
      [columnName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking ${columnName} column:`, error);
    return false;
  }
}

// Check if deleted_at column exists
async function checkDeletedAtColumn() {
  return checkColumn('deleted_at');
}

// Check if progress column exists in quarterly_priorities table
async function checkProgressColumn() {
  return checkColumn('progress');
}

// Get progress-safe query
async function getProgressSafeQuery() {
  const hasProgress = await checkProgressColumn();
  if (hasProgress) {
    return {
      select: 'p.*',
      update: `progress = COALESCE($4, progress),`
    };
  } else {
    console.warn('Progress column not found in quarterly_priorities table - database migration may be needed');
    return {
      select: `p.id, p.organization_id, p.title, p.description, p.owner_id, p.due_date, 
               p.quarter, p.year, p.is_company_priority, p.status, p.created_by, 
               p.created_at, p.updated_at, p.deleted_at, 0 as progress`,
      update: ''
    };
  }
}

// Get all priorities for a quarter
export const getQuarterlyPriorities = async (req, res) => {
  const { orgId, teamId } = req.params;
  const { quarter, year } = req.query;
  
  try {
    
    // Validate required parameters
    if (!quarter || !year) {
      return res.status(400).json({ 
        error: 'Quarter and year are required',
        received: { quarter, year }
      });
    }
    
    // Check if user is on leadership team
    const isLeadership = await isUserOnLeadershipTeam(req.user.id, orgId);
    console.log('User is on leadership team:', isLeadership);
    
    // Default values for quarter and year - ensure correct types
    const currentQuarter = String(quarter);
    const currentYear = parseInt(year);
    
    // Validate quarter format
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(currentQuarter)) {
      return res.status(400).json({ error: 'Invalid quarter format. Must be Q1, Q2, Q3, or Q4' });
    }
    
    // Validate year is a number
    if (isNaN(currentYear)) {
      return res.status(400).json({ error: 'Year must be a valid number' });
    }
    
    // Ensure types are correct
    console.log('Query parameters:', {
      orgId: { value: orgId, type: typeof orgId },
      quarter: { value: currentQuarter, type: typeof currentQuarter },
      year: { value: currentYear, type: typeof currentYear }
    });
    
    console.log('Fetching quarterly priorities:', { orgId, teamId, quarter: currentQuarter, year: currentYear });
    
    // Get predictions
    console.log('Query params for predictions:', { 
      $1: orgId, 
      $2: currentQuarter, 
      $3: currentYear,
      types: {
        orgId: typeof orgId,
        quarter: typeof currentQuarter,
        year: typeof currentYear
      }
    });
    
    // Try with explicit casting to handle potential type mismatches
    const predictionsResult = await query(
      `SELECT * FROM quarterly_predictions 
       WHERE organization_id = $1 AND quarter = $2::varchar AND year = $3::integer`,
      [orgId, currentQuarter, currentYear]
    );
    
    // Get all priorities - simplified query to debug
    let prioritiesResult;
    try {
      // First, let's try a simple query to see if basic parameter binding works
      console.log('Testing with simple query first...');
      const testResult = await query(
        `SELECT COUNT(*) FROM quarterly_priorities 
         WHERE organization_id = $1`,
        [orgId]
      );
      console.log('Simple query worked, count:', testResult.rows[0].count);
      
      // Check if deleted_at column exists
      const hasDeletedAt = await checkDeletedAtColumn();
      const deletedAtClause = hasDeletedAt ? ' AND p.deleted_at IS NULL' : '';
      
      // Now try the full query with explicit columns
      prioritiesResult = await query(
        `SELECT 
          p.*,
          u.first_name || ' ' || u.last_name as owner_name,
          u.email as owner_email,
          pub.first_name || ' ' || pub.last_name as published_by_name,
          t.is_leadership_team as priority_from_leadership_team,
          array_agg(
            json_build_object(
              'id', m.id,
              'title', m.title,
              'completed', m.completed,
              'due_date', m.due_date,
              'dueDate', m.due_date
            ) ORDER BY m.due_date
          ) FILTER (WHERE m.id IS NOT NULL) as milestones
         FROM quarterly_priorities p
         LEFT JOIN users u ON p.owner_id = u.id
         LEFT JOIN users pub ON p.published_by = pub.id
         LEFT JOIN priority_milestones m ON p.id = m.priority_id
         LEFT JOIN teams t ON p.team_id = t.id
         WHERE p.organization_id = $1::uuid 
           AND p.quarter = $2::varchar(2)
           AND p.year = $3::integer
           ${deletedAtClause}
           ${!isLeadership ? `
           AND (
             -- Show all priorities from non-leadership teams
             (t.is_leadership_team = false OR t.is_leadership_team IS NULL)
             -- Or show published priorities from leadership teams
             OR (t.is_leadership_team = true AND p.is_published_to_departments = true)
           )` : ''}
         GROUP BY p.id, u.first_name, u.last_name, u.email, pub.first_name, pub.last_name, t.is_leadership_team
         ORDER BY p.is_company_priority DESC, p.created_at`,
        [orgId, currentQuarter, currentYear]
      );
    } catch (queryError) {
      console.error('Priorities query error:', queryError);
      console.error('Query parameters were:', { orgId, currentQuarter, currentYear });
      throw queryError;
    }
    
    // Get latest updates for each priority
    const priorityIds = prioritiesResult.rows.map(p => p.id);
    let updates = {};
    
    if (priorityIds.length > 0) {
      const updatesResult = await query(
        `SELECT DISTINCT ON (priority_id) 
          priority_id,
          update_text,
          pu.created_at,
          u.first_name || ' ' || u.last_name as author_name
         FROM priority_updates pu
         JOIN users u ON pu.created_by = u.id
         WHERE priority_id = ANY($1)
         ORDER BY priority_id, pu.created_at DESC`,
        [priorityIds]
      );
      
      updatesResult.rows.forEach(update => {
        updates[update.priority_id] = {
          text: update.update_text,
          date: update.created_at,
          author: update.author_name
        };
      });
    }
    
    // Format response
    const priorities = prioritiesResult.rows.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      owner: {
        id: p.owner_id,
        name: p.owner_name,
        email: p.owner_email
      },
      dueDate: p.due_date,
      status: p.status,
      progress: p.progress,
      isCompanyPriority: p.is_company_priority,
      milestones: p.milestones || [],
      latestUpdate: updates[p.id] || null,
      isPublishedToDepartments: p.is_published_to_departments,
      publishedAt: p.published_at,
      publishedBy: p.published_by,
      publishedByName: p.published_by_name
    }));
    
    // Separate company and individual priorities
    const companyPriorities = priorities.filter(p => p.isCompanyPriority);
    const individualPriorities = priorities.filter(p => !p.isCompanyPriority);
    
    // Group individual priorities by owner
    const teamMemberPriorities = {};
    individualPriorities.forEach(p => {
      if (!teamMemberPriorities[p.owner.id]) {
        teamMemberPriorities[p.owner.id] = [];
      }
      teamMemberPriorities[p.owner.id].push(p);
    });
    
    // Format predictions data from database format to expected frontend format
    let formattedPredictions = {
      revenue: { target: 0, current: 0 },
      profit: { target: 0, current: 0 },
      measurables: { onTrack: 0, total: 0 }
    };
    
    if (predictionsResult.rows[0]) {
      const dbPredictions = predictionsResult.rows[0];
      formattedPredictions = {
        revenue: {
          target: parseFloat(dbPredictions.revenue_target) || 0,
          current: parseFloat(dbPredictions.revenue_current) || 0
        },
        profit: {
          target: parseFloat(dbPredictions.profit_target) || 0,
          current: parseFloat(dbPredictions.profit_current) || 0
        },
        measurables: {
          onTrack: parseInt(dbPredictions.measurables_on_track) || 0,
          total: parseInt(dbPredictions.measurables_total) || 0
        }
      };
    }
    
    res.json({
      success: true,
      data: {
        predictions: formattedPredictions,
        companyPriorities,
        teamMemberPriorities,
        teamMembers: await getTeamMembers(orgId)
      }
    });
  } catch (error) {
    console.error('Get quarterly priorities error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch quarterly priorities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      query: { orgId, teamId, quarter: req.query.quarter, year: req.query.year }
    });
  }
};

// Create a new priority
export const createPriority = async (req, res) => {
  let actualOwnerId; // Declare at function scope
  
  try {
    const { orgId, teamId } = req.params;
    const { 
      title, 
      description, 
      ownerId, 
      dueDate, 
      quarter, 
      year,
      isCompanyPriority,
      milestones = []
    } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!quarter || !year) {
      return res.status(400).json({ 
        error: 'Quarter and year are required',
        received: { quarter, year }
      });
    }
    
    // Use the current user's ID if no owner is specified
    actualOwnerId = ownerId || req.user.id;
    
    // Validate owner ID is a valid UUID
    if (!actualOwnerId || actualOwnerId === '') {
      return res.status(400).json({ error: 'Owner ID is required' });
    }
    
    // Convert empty string to null for date field
    const parsedDueDate = dueDate === '' ? null : dueDate;
    
    const priorityId = uuidv4();
    
    // Check which columns exist
    const hasProgress = await checkProgressColumn();
    const hasCreatedBy = await checkColumn('created_by');
    
    // Build dynamic insert query based on available columns
    let columns = ['id', 'organization_id', 'title', 'description', 'owner_id', 'due_date', 'quarter', 'year', 'is_company_priority', 'status'];
    let values = [priorityId, orgId, title, description, actualOwnerId, parsedDueDate, quarter, year, isCompanyPriority, 'on-track'];
    
    // Only add team_id if it's not the default empty UUID
    if (teamId && teamId !== '00000000-0000-0000-0000-000000000000') {
      columns.splice(2, 0, 'team_id'); // Insert after organization_id
      values.splice(2, 0, teamId);
    }
    let placeholders = [];
    
    // Build placeholders for the initial values
    for (let i = 1; i <= values.length; i++) {
      placeholders.push(`$${i}`);
    }
    
    if (hasProgress) {
      columns.push('progress');
      values.push(0);
      placeholders.push(`$${values.length}`);
    }
    
    if (hasCreatedBy) {
      columns.push('created_by');
      values.push(req.user.id);
      placeholders.push(`$${values.length}`);
    }
    
    const insertQuery = `
      INSERT INTO quarterly_priorities (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    
    console.log('Creating priority with query:', insertQuery);
    console.log('Values:', values);
    console.log('Values mapped to columns:');
    columns.forEach((col, index) => {
      console.log(`  ${col}: ${values[index]} (type: ${typeof values[index]})`);
    });
    
    const result = await query(insertQuery, values);
    
    // Create milestones if provided
    if (milestones.length > 0) {
      for (const milestone of milestones) {
        const milestoneDueDate = milestone.dueDate === '' ? null : milestone.dueDate;
        await query(
          `INSERT INTO priority_milestones (id, priority_id, title, due_date, completed)
           VALUES ($1, $2, $3, $4, $5)`,
          [uuidv4(), priorityId, milestone.title, milestoneDueDate, false]
        );
      }
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create priority error:', error);
    console.error('Request body:', req.body);
    console.error('Actual owner ID used:', actualOwnerId);
    
    // Provide more specific error messages
    if (error.code === '22P02' && error.message.includes('uuid')) {
      return res.status(400).json({ 
        error: 'Invalid UUID format',
        details: 'Owner ID must be a valid UUID',
        receivedOwnerId: req.body.ownerId
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create priority',
      details: error.message,
      code: error.code,
      requestBody: req.body
    });
  }
};

// Update a priority
export const updatePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { title, description, status, progress, dueDate, ownerId, isCompanyPriority } = req.body;
    
    // Convert empty string to null for date field, and handle undefined
    const parsedDueDate = (dueDate === '' || dueDate === undefined) ? null : dueDate;
    
    // Check if progress column exists
    const hasProgress = await checkProgressColumn();
    
    let query_text;
    let query_params;
    
    // Build dynamic UPDATE query based on what fields are provided
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    if (title !== undefined) {
      paramCount++;
      updateFields.push(`title = $${paramCount}`);
      updateValues.push(title);
    }
    
    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      updateValues.push(description);
    }
    
    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(status);
    }
    
    if (dueDate !== undefined) {
      paramCount++;
      updateFields.push(`due_date = $${paramCount}`);
      updateValues.push(parsedDueDate);
    }
    
    if (ownerId !== undefined) {
      paramCount++;
      updateFields.push(`owner_id = $${paramCount}`);
      updateValues.push(ownerId);
    }
    
    if (isCompanyPriority !== undefined) {
      paramCount++;
      updateFields.push(`is_company_priority = $${paramCount}`);
      updateValues.push(isCompanyPriority);
    }
    
    if (hasProgress && progress !== undefined) {
      paramCount++;
      updateFields.push(`progress = $${paramCount}`);
      updateValues.push(progress);
    }
    
    // Always update the updated_at field
    updateFields.push('updated_at = NOW()');
    
    // Add the WHERE clause parameters
    paramCount++;
    const priorityIdParam = paramCount;
    updateValues.push(priorityId);
    
    paramCount++;
    const orgIdParam = paramCount;
    updateValues.push(orgId);
    
    query_text = `UPDATE quarterly_priorities 
      SET ${updateFields.join(', ')}
      WHERE id = $${priorityIdParam} AND organization_id = $${orgIdParam}
      RETURNING *`;
    
    query_params = updateValues;
    
    const result = await query(query_text, query_params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update priority error:', error);
    res.status(500).json({ error: 'Failed to update priority' });
  }
};

// Delete a priority
export const deletePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    
    await query(
      `DELETE FROM quarterly_priorities 
       WHERE id = $1 AND organization_id = $2`,
      [priorityId, orgId]
    );
    
    res.json({
      success: true,
      message: 'Priority deleted successfully'
    });
  } catch (error) {
    console.error('Delete priority error:', error);
    res.status(500).json({ error: 'Failed to delete priority' });
  }
};

// Archive a priority (soft delete)
export const archivePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    
    // Check if deleted_at column exists
    const hasDeletedAt = await checkDeletedAtColumn();
    
    if (!hasDeletedAt) {
      // If deleted_at column doesn't exist, fall back to hard delete
      console.warn('deleted_at column not found, falling back to hard delete');
      return deletePriority(req, res);
    }
    
    const result = await query(
      `UPDATE quarterly_priorities 
       SET deleted_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [priorityId, orgId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Priority not found or already archived' });
    }
    
    res.json({
      success: true,
      message: 'Priority archived successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Archive priority error:', error);
    res.status(500).json({ error: 'Failed to archive priority' });
  }
};

// Update predictions
export const updatePredictions = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { quarter, year, revenue, profit, measurables } = req.body;
    
    // Upsert predictions
    const result = await query(
      `INSERT INTO quarterly_predictions 
       (id, organization_id, quarter, year, revenue_target, revenue_current, 
        profit_target, profit_current, measurables_on_track, measurables_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (organization_id, quarter, year) 
       DO UPDATE SET
         revenue_target = $5,
         revenue_current = $6,
         profit_target = $7,
         profit_current = $8,
         measurables_on_track = $9,
         measurables_total = $10,
         updated_at = NOW()
       RETURNING *`,
      [
        uuidv4(), orgId, quarter, year,
        revenue.target, revenue.current,
        profit.target, profit.current,
        measurables.onTrack, measurables.total
      ]
    );
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update predictions error:', error);
    res.status(500).json({ error: 'Failed to update predictions' });
  }
};

// Create milestone
export const createMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { title, dueDate } = req.body;
    
    console.log('Creating milestone with data:', { title, dueDate, body: req.body });
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Milestone title is required' });
    }
    
    // Convert empty string to null for date field
    const parsedDueDate = dueDate === '' ? null : dueDate;
    
    const result = await query(
      `INSERT INTO priority_milestones 
       (id, priority_id, title, due_date, completed)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [uuidv4(), priorityId, title, parsedDueDate]
    );
    
    // Update priority progress
    await updatePriorityProgress(priorityId);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create milestone error:', error);
    res.status(500).json({ error: 'Failed to create milestone' });
  }
};

// Update milestone
export const updateMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId, milestoneId } = req.params;
    const { title, dueDate, completed } = req.body;
    
    // Convert empty string to null for date field
    const parsedDueDate = dueDate === '' ? null : dueDate;
    
    // First, check if milestone exists
    const existingMilestone = await query(
      'SELECT id, priority_id FROM priority_milestones WHERE id = $1',
      [milestoneId]
    );
    
    if (existingMilestone.rows.length === 0) {
      console.warn(`Milestone not found: ${milestoneId}`);
      return res.status(404).json({ 
        error: 'Milestone not found',
        milestoneId: milestoneId
      });
    }
    
    // Verify milestone belongs to the correct priority
    if (existingMilestone.rows[0].priority_id !== priorityId) {
      return res.status(404).json({ 
        error: 'Milestone does not belong to this priority',
        milestoneId: milestoneId,
        priorityId: priorityId
      });
    }
    
    const result = await query(
      `UPDATE priority_milestones 
       SET title = COALESCE($1, title),
           due_date = COALESCE($2, due_date),
           completed = COALESCE($3, completed),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [title, parsedDueDate, completed, milestoneId]
    );
    
    // Update priority progress based on milestones
    await updatePriorityProgress(result.rows[0].priority_id);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update milestone error:', error);
    console.error('Params:', { orgId, teamId, priorityId, milestoneId });
    res.status(500).json({ 
      error: 'Failed to update milestone',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete milestone
export const deleteMilestone = async (req, res) => {
  try {
    const { orgId, teamId, priorityId, milestoneId } = req.params;
    
    // First, check if milestone exists
    const existingMilestone = await query(
      'SELECT id FROM priority_milestones WHERE id = $1 AND priority_id = $2',
      [milestoneId, priorityId]
    );
    
    if (existingMilestone.rows.length === 0) {
      console.warn(`Milestone not found for deletion: ${milestoneId}`);
      return res.status(404).json({ 
        error: 'Milestone not found',
        milestoneId: milestoneId,
        priorityId: priorityId
      });
    }
    
    const result = await query(
      `DELETE FROM priority_milestones 
       WHERE id = $1 AND priority_id = $2
       RETURNING priority_id`,
      [milestoneId, priorityId]
    );
    
    // Update priority progress
    await updatePriorityProgress(priorityId);
    
    res.json({
      success: true,
      message: 'Milestone deleted successfully'
    });
  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
};

// Add update to priority
export const addPriorityUpdate = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { updateText, statusChange } = req.body;
    
    const result = await query(
      `INSERT INTO priority_updates 
       (id, priority_id, update_text, status_change, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), priorityId, updateText, statusChange, req.user.id]
    );
    
    // If status changed, update the priority
    if (statusChange) {
      await query(
        `UPDATE quarterly_priorities 
         SET status = $1 
         WHERE id = $2`,
        [statusChange, priorityId]
      );
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Add priority update error:', error);
    res.status(500).json({ error: 'Failed to add update' });
  }
};

// Helper function to get team members
async function getTeamMembers(orgId) {
  console.log('Getting team members for org:', orgId);
  const result = await query(
    `SELECT 
      u.id,
      u.first_name || ' ' || u.last_name as name,
      u.role
     FROM users u
     WHERE u.organization_id = $1
     ORDER BY u.first_name, u.last_name`,
    [orgId]
  );
  
  console.log(`Found ${result.rows.length} team members`);
  return result.rows;
}

// Helper function to update priority progress based on milestones
async function updatePriorityProgress(priorityId) {
  try {
    // Check if progress column exists
    const hasProgress = await checkProgressColumn();
    if (!hasProgress) {
      console.log('Skipping progress update - column does not exist');
      return;
    }
    
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
       FROM priority_milestones
       WHERE priority_id = $1`,
      [priorityId]
    );
    
    const { total, completed } = result.rows[0];
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    await query(
      `UPDATE quarterly_priorities 
       SET progress = $1 
       WHERE id = $2`,
      [progress, priorityId]
    );
  } catch (error) {
    console.error('Error updating priority progress:', error);
    // Don't throw - just log the error
  }
}

// Get archived priorities
export const getArchivedPriorities = async (req, res) => {
  const { orgId, teamId } = req.params;
  
  try {
    console.log('Fetching archived priorities:', { orgId, teamId });
    
    // Check if deleted_at column exists
    const hasDeletedAt = await checkDeletedAtColumn();
    
    if (!hasDeletedAt) {
      // If deleted_at column doesn't exist, return empty result
      console.warn('deleted_at column not found, returning empty archived priorities');
      return res.json({
        success: true,
        data: {}
      });
    }
    
    // Check if user is on leadership team
    const isLeadership = await isUserOnLeadershipTeam(req.user.id, orgId);
    console.log('User is on leadership team:', isLeadership);
    
    // Get progress-safe query
    const { select } = await getProgressSafeQuery();
    
    // Get all archived priorities
    const prioritiesResult = await query(
      `SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        t.is_leadership_team as priority_from_leadership_team,
        array_agg(
          json_build_object(
            'id', m.id,
            'title', m.title,
            'completed', m.completed,
            'due_date', m.due_date,
            'dueDate', m.due_date
          ) ORDER BY m.due_date
        ) FILTER (WHERE m.id IS NOT NULL) as milestones
       FROM quarterly_priorities p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN priority_milestones m ON p.id = m.priority_id
       LEFT JOIN teams t ON p.team_id = t.id
       WHERE p.organization_id = $1::uuid 
         AND p.deleted_at IS NOT NULL
         ${!isLeadership ? `
         AND (
           -- Show all priorities from non-leadership teams
           (t.is_leadership_team = false OR t.is_leadership_team IS NULL)
           -- Or show published priorities from leadership teams
           OR (t.is_leadership_team = true AND p.is_published_to_departments = true)
         )` : ''}
       GROUP BY p.id, u.first_name, u.last_name, u.email, t.is_leadership_team
       ORDER BY p.deleted_at DESC, p.is_company_priority DESC, p.created_at`,
      [orgId]
    );
    
    // Get latest updates for each priority
    const priorityIds = prioritiesResult.rows.map(p => p.id);
    let updates = {};
    
    if (priorityIds.length > 0) {
      const updatesResult = await query(
        `SELECT DISTINCT ON (priority_id) 
          priority_id,
          update_text,
          pu.created_at,
          u.first_name || ' ' || u.last_name as author_name
         FROM priority_updates pu
         JOIN users u ON pu.created_by = u.id
         WHERE priority_id = ANY($1)
         ORDER BY priority_id, pu.created_at DESC`,
        [priorityIds]
      );
      
      updatesResult.rows.forEach(update => {
        updates[update.priority_id] = {
          text: update.update_text,
          date: update.created_at,
          author: update.author_name
        };
      });
    }
    
    // Format response
    const priorities = prioritiesResult.rows.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      owner: {
        id: p.owner_id,
        name: p.owner_name,
        email: p.owner_email
      },
      dueDate: p.due_date,
      status: p.status,
      progress: p.progress,
      isCompanyPriority: p.is_company_priority,
      milestones: p.milestones || [],
      latestUpdate: updates[p.id] || null,
      quarter: p.quarter,
      year: p.year,
      archivedAt: p.deleted_at
    }));
    
    // Group by quarter/year
    const groupedPriorities = {};
    priorities.forEach(p => {
      const key = `${p.quarter} ${p.year}`;
      if (!groupedPriorities[key]) {
        groupedPriorities[key] = {
          quarter: p.quarter,
          year: p.year,
          companyPriorities: [],
          teamMemberPriorities: {}
        };
      }
      
      if (p.isCompanyPriority) {
        groupedPriorities[key].companyPriorities.push(p);
      } else {
        if (!groupedPriorities[key].teamMemberPriorities[p.owner.id]) {
          groupedPriorities[key].teamMemberPriorities[p.owner.id] = [];
        }
        groupedPriorities[key].teamMemberPriorities[p.owner.id].push(p);
      }
    });
    
    res.json({
      success: true,
      data: groupedPriorities
    });
  } catch (error) {
    console.error('Get archived priorities error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch archived priorities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current priorities (simplified - no quarter logic)
export const getCurrentPriorities = async (req, res) => {
  const { orgId, teamId } = req.params;
  
  try {
    console.log('Fetching current priorities for:', { orgId, teamId });
    
    // Check if deleted_at column exists
    const hasDeletedAt = await checkDeletedAtColumn();
    console.log('deleted_at column exists:', hasDeletedAt);
    
    // Check if user is on leadership team
    const isLeadership = await isUserOnLeadershipTeam(req.user.id, orgId);
    console.log('User is on leadership team:', isLeadership);
    
    // Get current active priorities (non-deleted)
    // Always filter out deleted items - only use IS NULL for timestamp columns
    // Add visibility filtering: if user is not on leadership team, only show published priorities from leadership teams
    const prioritiesQuery = `
      SELECT 
        p.*,
        u.first_name || ' ' || u.last_name as owner_name,
        u.email as owner_email,
        u.first_name as owner_first_name,
        u.last_name as owner_last_name,
        pub.first_name || ' ' || pub.last_name as published_by_name,
        t.is_leadership_team as priority_from_leadership_team
      FROM quarterly_priorities p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN users pub ON p.published_by = pub.id
      LEFT JOIN teams t ON p.team_id = t.id
      WHERE p.organization_id = $1 
      AND p.deleted_at IS NULL
      ${!isLeadership ? `
      AND (
        -- Show all priorities from non-leadership teams
        (t.is_leadership_team = false OR t.is_leadership_team IS NULL)
        -- Or show published priorities from leadership teams
        OR (t.is_leadership_team = true AND p.is_published_to_departments = true)
      )` : ''}
      ORDER BY p.is_company_priority DESC, p.created_at ASC
    `;
    
    console.log('Executing query:', prioritiesQuery);
    console.log('Is leadership team member:', isLeadership);
    
    const prioritiesResult = await query(prioritiesQuery, [orgId]);
    console.log(`Found ${prioritiesResult.rows.length} priorities:`, 
      prioritiesResult.rows.map(p => ({ 
        id: p.id, 
        title: p.title, 
        deleted_at: p.deleted_at,
        deleted_at_type: typeof p.deleted_at,
        is_null: p.deleted_at === null,
        is_undefined: p.deleted_at === undefined
      })));
    
    // Get milestones for all priorities
    const priorityIds = prioritiesResult.rows.map(p => p.id);
    let milestonesByPriority = {};
    let updatesByPriority = {};
    
    if (priorityIds.length > 0) {
      const milestonesResult = await query(
        `SELECT * FROM priority_milestones WHERE priority_id = ANY($1) ORDER BY due_date`,
        [priorityIds]
      );
      
      milestonesResult.rows.forEach(milestone => {
        if (!milestonesByPriority[milestone.priority_id]) {
          milestonesByPriority[milestone.priority_id] = [];
        }
        milestonesByPriority[milestone.priority_id].push(milestone);
      });
      
      // Get latest update for each priority
      const updatesResult = await query(
        `SELECT DISTINCT ON (priority_id) 
          priority_id,
          update_text,
          pu.created_at,
          u.first_name || ' ' || u.last_name as author_name
         FROM priority_updates pu
         JOIN users u ON pu.created_by = u.id
         WHERE priority_id = ANY($1)
         ORDER BY priority_id, pu.created_at DESC`,
        [priorityIds]
      );
      
      updatesResult.rows.forEach(update => {
        updatesByPriority[update.priority_id] = {
          text: update.update_text,
          date: update.created_at,
          author: update.author_name
        };
      });
    }
    
    // Separate company and individual priorities
    const companyPriorities = [];
    const teamMemberPriorities = {};
    
    // Filter out any priorities that somehow have deleted_at set (double-check)
    const activePriorities = prioritiesResult.rows.filter(priority => {
      const isDeleted = priority.deleted_at !== null && priority.deleted_at !== undefined;
      if (isDeleted) {
        console.log(`Filtering out deleted priority: ${priority.title} (deleted_at: ${priority.deleted_at})`);
      }
      return !isDeleted;
    });

    console.log(`After deletion filter: ${activePriorities.length} active priorities`);

    activePriorities.forEach(priority => {
      const priorityWithMilestones = {
        ...priority,
        milestones: (milestonesByPriority[priority.id] || []).map(m => ({
          ...m,
          dueDate: m.due_date
        })),
        owner: priority.owner_id ? {
          id: priority.owner_id,
          name: priority.owner_name,
          email: priority.owner_email
        } : null,
        dueDate: priority.due_date,
        owner_first_name: priority.owner_first_name,
        owner_last_name: priority.owner_last_name,
        latestUpdate: updatesByPriority[priority.id] || null,
        isCompanyPriority: priority.is_company_priority,
        isPublishedToDepartments: priority.is_published_to_departments,
        publishedAt: priority.published_at,
        publishedBy: priority.published_by,
        publishedByName: priority.published_by_name
      };
      
      console.log(`Processing priority: ${priority.title}, is_company_priority: ${priority.is_company_priority}, owner_id: ${priority.owner_id}, deleted_at: ${priority.deleted_at}`);
      
      if (priority.is_company_priority) {
        companyPriorities.push(priorityWithMilestones);
      } else if (priority.owner_id) {
        if (!teamMemberPriorities[priority.owner_id]) {
          teamMemberPriorities[priority.owner_id] = {
            member: {
              id: priority.owner_id,
              name: priority.owner_name,
              email: priority.owner_email
            },
            priorities: []
          };
        }
        teamMemberPriorities[priority.owner_id].priorities.push(priorityWithMilestones);
        console.log(`Added individual priority to owner ${priority.owner_id}: ${priority.title}`);
      } else {
        console.log(`Priority ${priority.title} has no owner and is not company priority`);
      }
    });
    
    console.log(`Final counts - Company: ${companyPriorities.length}, Individual owners: ${Object.keys(teamMemberPriorities).length}`);
    
    // Get predictions (latest/current predictions for the organization)
    let predictions = {};
    try {
      const predictionsResult = await query(
        `SELECT * FROM quarterly_predictions 
         WHERE organization_id = $1 
         ORDER BY created_at DESC LIMIT 1`,
        [orgId]
      );
      
      if (predictionsResult.rows.length > 0) {
        const pred = predictionsResult.rows[0];
        predictions = {
          revenue: {
            target: parseFloat(pred.revenue_target) || 0,
            current: parseFloat(pred.revenue_current) || 0
          },
          profit: {
            target: parseFloat(pred.profit_target) || 0,
            current: parseFloat(pred.profit_current) || 0
          },
          measurables: {
            onTrack: parseInt(pred.measurables_on_track) || 0,
            total: parseInt(pred.measurables_total) || 0
          }
        };
      }
    } catch (predError) {
      console.error('Error fetching predictions:', predError);
      predictions = {};
    }

    // Get team members list for the frontend
    const teamMembersResult = await query(
      `SELECT DISTINCT u.id, u.first_name || ' ' || u.last_name as name, u.email, u.role, u.first_name
       FROM users u 
       WHERE u.organization_id = $1 AND u.role != 'consultant'
       ORDER BY u.first_name`,
      [orgId]
    );

    // Ensure data types are correct for frontend
    const responseData = {
      companyPriorities: Array.isArray(companyPriorities) ? companyPriorities : [],
      teamMemberPriorities: typeof teamMemberPriorities === 'object' ? teamMemberPriorities : {},
      predictions: typeof predictions === 'object' ? predictions : {},
      teamMembers: Array.isArray(teamMembersResult.rows) ? teamMembersResult.rows : []
    };
    
    console.log('Response data structure:', {
      companyPriorities: `Array[${responseData.companyPriorities.length}]`,
      teamMemberPriorities: `Object with ${Object.keys(responseData.teamMemberPriorities).length} keys`,
      predictions: `Object with keys: ${Object.keys(responseData.predictions).join(', ')}`,
      teamMembers: `Array[${responseData.teamMembers.length}]`
    });

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get current priorities error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch current priorities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      data: {
        companyPriorities: [],
        teamMemberPriorities: {},
        predictions: {},
        teamMembers: []
      }
    });
  }
};

// @desc    Publish priority to departments
// @route   PUT /api/v1/quarterly-priorities/:priorityId/publish
// @access  Private (Leadership Team only)
export const publishPriority = async (req, res) => {
  try {
    const { priorityId } = req.params;
    const userId = req.user.id;
    
    // Check if user is on leadership team
    const isLeadership = await query(
      `SELECT EXISTS (
        SELECT 1 FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE t.is_leadership_team = true 
        AND tm.user_id = $1
        AND t.organization_id = $2
      ) as is_leadership`,
      [userId, req.user.organizationId]
    );
    
    if (!isLeadership.rows[0].is_leadership) {
      return res.status(403).json({
        success: false,
        error: 'Only leadership team members can publish priorities'
      });
    }
    
    // Update the priority
    const result = await query(
      `UPDATE quarterly_priorities 
       SET is_published_to_departments = true,
           published_at = NOW(),
           published_by = $1
       WHERE id = $2 AND organization_id = $3
       RETURNING id`,
      [userId, priorityId, req.user.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Priority not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Priority published to departments'
    });
  } catch (error) {
    console.error('Error publishing priority:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish priority'
    });
  }
};

// @desc    Unpublish priority from departments
// @route   PUT /api/v1/quarterly-priorities/:priorityId/unpublish
// @access  Private (Leadership Team only)
export const unpublishPriority = async (req, res) => {
  try {
    const { priorityId } = req.params;
    const userId = req.user.id;
    
    // Check if user is on leadership team
    const isLeadership = await query(
      `SELECT EXISTS (
        SELECT 1 FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE t.is_leadership_team = true 
        AND tm.user_id = $1
        AND t.organization_id = $2
      ) as is_leadership`,
      [userId, req.user.organizationId]
    );
    
    if (!isLeadership.rows[0].is_leadership) {
      return res.status(403).json({
        success: false,
        error: 'Only leadership team members can unpublish priorities'
      });
    }
    
    // Update the priority
    const result = await query(
      `UPDATE quarterly_priorities 
       SET is_published_to_departments = false,
           published_at = NULL,
           published_by = NULL
       WHERE id = $1 AND organization_id = $2
       RETURNING id`,
      [priorityId, req.user.organizationId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Priority not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Priority unpublished from departments'
    });
  } catch (error) {
    console.error('Error unpublishing priority:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unpublish priority'
    });
  }
};

// Cleanup test priorities (admin function)
export const cleanupTestPriorities = async (req, res) => {
  try {
    console.log('Starting cleanup of test priorities...');
    
    // First, check what we're about to clean up
    const testPrioritiesQuery = `
      SELECT id, title, description, deleted_at
      FROM quarterly_priorities 
      WHERE (title ILIKE '%test%' 
         OR title ILIKE '%trests%'
         OR title ILIKE '%reddfd%'
         OR description ILIKE '%test%'
         OR description ILIKE '%dddd%'
         OR description ILIKE '%dfdfd%'
         OR description ILIKE '%ddsdfsdfsd%')
      AND deleted_at IS NULL
    `;
    
    const testPriorities = await query(testPrioritiesQuery);
    console.log(`Found ${testPriorities.rows.length} test priorities to clean up:`, 
      testPriorities.rows.map(p => ({ id: p.id, title: p.title })));
    
    if (testPriorities.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No test priorities found to clean up',
        cleanedCount: 0
      });
    }
    
    // Archive (soft delete) test priorities
    const cleanupQuery = `
      UPDATE quarterly_priorities 
      SET deleted_at = NOW()
      WHERE (title ILIKE '%test%' 
         OR title ILIKE '%trests%'
         OR title ILIKE '%reddfd%'
         OR description ILIKE '%test%'
         OR description ILIKE '%dddd%'
         OR description ILIKE '%dfdfd%'
         OR description ILIKE '%ddsdfsdfsd%')
      AND deleted_at IS NULL
      RETURNING id, title
    `;
    
    const cleanupResult = await query(cleanupQuery);
    console.log(`Cleaned up ${cleanupResult.rows.length} test priorities`);
    
    res.json({
      success: true,
      message: `Successfully archived ${cleanupResult.rows.length} test priorities`,
      cleanedCount: cleanupResult.rows.length,
      cleanedPriorities: cleanupResult.rows
    });
    
  } catch (error) {
    console.error('Cleanup test priorities error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to cleanup test priorities',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};