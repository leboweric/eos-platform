import cron from 'node-cron';
import pkg from 'pg';
const { Pool } = pkg;

// Import database config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Scheduled job to convert overdue todos into issues
 * Runs daily at midnight (00:00)
 */
cron.schedule('0 0 * * *', async () => {
  const startTime = Date.now();
  console.log('🔄 [CRON] Starting overdue todos check...', new Date().toISOString());
  
  try {
    // Find all overdue todos across all organizations
    // For multi-assignee todos, create one issue per assignee
    const result = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.due_date,
        t.owner_id,
        t.team_id,
        t.organization_id,
        t.is_multi_assignee,
        COALESCE(ta.user_id, t.assigned_to_id, t.owner_id) as assignee_id,
        (CURRENT_DATE - t.due_date) as days_overdue
      FROM todos t
      LEFT JOIN todo_assignees ta ON t.id = ta.todo_id AND t.is_multi_assignee = TRUE
      WHERE t.due_date < CURRENT_DATE
      AND t.due_date >= '2026-01-06'  -- Only process todos that became overdue from Jan 6, 2026 forward
      AND t.status NOT IN ('complete', 'cancelled')
      AND t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM issues i 
        WHERE i.related_todo_id = t.id 
        AND i.owner_id = COALESCE(ta.user_id, t.assigned_to_id, t.owner_id)
        AND i.deleted_at IS NULL
      )
    `);
    
    const overdueTodos = result.rows;
    console.log(`📋 [CRON] Found ${overdueTodos.length} overdue todos to convert`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Create issue for each overdue todo
    for (const todo of overdueTodos) {
      try {
        await createIssueFromOverdueTodo(todo);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`❌ [CRON] Failed to create issue for todo ${todo.id}:`, error.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [CRON] Completed overdue todos job in ${duration}ms`);
    console.log(`📊 [CRON] Results: ${successCount} success, ${errorCount} errors`);
    
  } catch (error) {
    console.error('❌ [CRON] Overdue todos job failed:', error);
  }
});

/**
 * Create an issue from an overdue todo
 */
async function createIssueFromOverdueTodo(todo) {
  const daysOverdue = Math.floor(todo.days_overdue);
  
  const issueData = {
    organization_id: todo.organization_id,
    team_id: todo.team_id,
    title: `Overdue: ${todo.title}`,
    description: `This to-do is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue.\n\nOriginal due date: ${todo.due_date}\n\n${todo.description || ''}`,
    timeline: 'short_term',
    priority_level: daysOverdue > 7 ? 'high' : 'normal',
    related_todo_id: todo.id,
    created_by: todo.owner_id
  };
  
  await pool.query(`
    INSERT INTO issues (
      organization_id,
      team_id,
      title,
      description,
      timeline,
      priority_level,
      priority_rank,
      related_todo_id,
      created_by_id,
      owner_id,
      status,
      archived,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', false, NOW())
  `, [
    issueData.organization_id,
    issueData.team_id,
    issueData.title,
    issueData.description,
    issueData.timeline,
    issueData.priority_level,
    9999,  // priority_rank = 9999 puts overdue issues at bottom of list
    issueData.related_todo_id,
    issueData.created_by,
    todo.assignee_id  // Set issue owner to the assignee (handles multi-assignee todos)
  ]);
  
  console.log(`📋 [CRON] Created issue for overdue todo: "${todo.title}"`);
}

/**
 * Manual function to trigger overdue todos conversion (for testing/manual triggers)
 */
export async function convertOverdueTodos() {
  const startTime = Date.now();
  console.log('🔄 [MANUAL] Starting overdue todos conversion...', new Date().toISOString());
  
  try {
    // Find all overdue todos across all organizations
    // For multi-assignee todos, create one issue per assignee
    const result = await pool.query(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.due_date,
        t.owner_id,
        t.team_id,
        t.organization_id,
        t.is_multi_assignee,
        COALESCE(ta.user_id, t.assigned_to_id, t.owner_id) as assignee_id,
        (CURRENT_DATE - t.due_date) as days_overdue
      FROM todos t
      LEFT JOIN todo_assignees ta ON t.id = ta.todo_id AND t.is_multi_assignee = TRUE
      WHERE t.due_date < CURRENT_DATE
      AND t.due_date >= '2026-01-06'  -- Only process todos that became overdue from Jan 6, 2026 forward
      AND t.status NOT IN ('complete', 'cancelled')
      AND t.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM issues i 
        WHERE i.related_todo_id = t.id 
        AND i.owner_id = COALESCE(ta.user_id, t.assigned_to_id, t.owner_id)
        AND i.deleted_at IS NULL
      )
    `);
    
    const overdueTodos = result.rows;
    console.log(`📋 [MANUAL] Found ${overdueTodos.length} overdue todos to convert`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Create issue for each overdue todo
    for (const todo of overdueTodos) {
      try {
        await createIssueFromOverdueTodo(todo);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`❌ [MANUAL] Failed to create issue for todo ${todo.id}:`, error.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ [MANUAL] Completed overdue todos conversion in ${duration}ms`);
    console.log(`📊 [MANUAL] Results: ${successCount} success, ${errorCount} errors`);
    
    return { successCount, errorCount, totalProcessed: overdueTodos.length };
    
  } catch (error) {
    console.error('❌ [MANUAL] Overdue todos conversion failed:', error);
    throw error;
  }
}

console.log('⏰ [CRON] Overdue todos job scheduled - runs daily at midnight');

export default {};