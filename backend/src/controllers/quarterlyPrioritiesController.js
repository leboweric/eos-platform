import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

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
      
      // Now try the full query with explicit columns
      prioritiesResult = await query(
        `SELECT 
          p.*,
          u.first_name || ' ' || u.last_name as owner_name,
          u.email as owner_email,
          array_agg(
            json_build_object(
              'id', m.id,
              'title', m.title,
              'completed', m.completed,
              'due_date', m.due_date
            ) ORDER BY m.due_date
          ) FILTER (WHERE m.id IS NOT NULL) as milestones
         FROM quarterly_priorities p
         LEFT JOIN users u ON p.owner_id = u.id
         LEFT JOIN priority_milestones m ON p.id = m.priority_id
         WHERE p.organization_id = $1::uuid 
           AND p.quarter = $2::varchar(2)
           AND p.year = $3::integer
         GROUP BY p.id, u.first_name, u.last_name, u.email
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
          created_at,
          u.first_name || ' ' || u.last_name as author_name
         FROM priority_updates pu
         JOIN users u ON pu.created_by = u.id
         WHERE priority_id = ANY($1)
         ORDER BY priority_id, created_at DESC`,
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
      latestUpdate: updates[p.id] || null
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
    
    res.json({
      success: true,
      data: {
        predictions: predictionsResult.rows[0] || {
          revenue: { target: 0, current: 0 },
          profit: { target: 0, current: 0 },
          measurables: { onTrack: 0, total: 0 }
        },
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
    
    // Use the current user's ID if no owner is specified
    actualOwnerId = ownerId || req.user.id;
    
    // Validate owner ID is a valid UUID
    if (!actualOwnerId || actualOwnerId === '') {
      return res.status(400).json({ error: 'Owner ID is required' });
    }
    
    const priorityId = uuidv4();
    
    // Check which columns exist
    const hasProgress = await checkProgressColumn();
    const hasCreatedBy = await checkColumn('created_by');
    
    // Build dynamic insert query based on available columns
    let columns = ['id', 'organization_id', 'title', 'description', 'owner_id', 'due_date', 'quarter', 'year', 'is_company_priority', 'status'];
    let values = [priorityId, orgId, title, description, actualOwnerId, dueDate, quarter, year, isCompanyPriority, 'on-track'];
    
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
      const milestoneValues = milestones.map(m => 
        `('${uuidv4()}', '${priorityId}', '${m.title}', '${m.dueDate}', false)`
      ).join(',');
      
      await query(
        `INSERT INTO priority_milestones (id, priority_id, title, due_date, completed)
         VALUES ${milestoneValues}`
      );
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
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update a priority
export const updatePriority = async (req, res) => {
  try {
    const { orgId, teamId, priorityId } = req.params;
    const { title, description, status, progress } = req.body;
    
    // Get progress-safe query parts
    const { update } = await getProgressSafeQuery();
    
    const result = await query(
      `UPDATE quarterly_priorities 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           ${update}
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [title, description, status, progress, priorityId, orgId]
    );
    
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
    
    const result = await query(
      `INSERT INTO priority_milestones 
       (id, priority_id, title, due_date, completed)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [uuidv4(), priorityId, title, dueDate]
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
      [title, dueDate, completed, milestoneId]
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
      u.role,
      d.name as department
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.organization_id = $1 AND u.deleted_at IS NULL
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