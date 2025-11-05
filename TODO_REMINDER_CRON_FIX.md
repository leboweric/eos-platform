# Todo Reminder Cron Job Fix

## Issue Found

The 2-day todo reminder cron job was **failing to send reminders for multi-assignee todos**.

### Root Cause

After implementing multi-assignee todos (migration 067), the reminder query only checked `assigned_to_id`, which is NULL for multi-assignee todos. Multi-assignee todos store their assignees in the `todo_assignees` junction table.

**Old Query (BROKEN):**
```sql
SELECT 
  t.title, 
  t.due_date, 
  u.email, 
  u.first_name
FROM todos t
JOIN users u ON t.assigned_to_id = u.id  -- ❌ NULL for multi-assignee
WHERE t.due_date = $1
  AND t.status != 'complete'
  AND t.deleted_at IS NULL
  AND u.email IS NOT NULL
```

**Result:** Only single-assignee todos got reminders.

### Solution

Updated the query to handle both single-assignee and multi-assignee todos using LEFT JOINs and COALESCE.

**New Query (FIXED):**
```sql
SELECT DISTINCT
  t.title, 
  t.due_date, 
  COALESCE(u2.email, u.email) as email,
  COALESCE(u2.first_name, u.first_name) as first_name
FROM todos t
LEFT JOIN users u ON t.assigned_to_id = u.id
LEFT JOIN todo_assignees ta ON t.id = ta.todo_id
LEFT JOIN users u2 ON ta.user_id = u2.id
WHERE t.due_date = $1
  AND t.status != 'complete'
  AND t.deleted_at IS NULL
  AND COALESCE(u2.email, u.email) IS NOT NULL
```

**How it works:**
- `u` = user from single-assignee (assigned_to_id)
- `u2` = user from multi-assignee (todo_assignees table)
- `COALESCE(u2.email, u.email)` = use u2 if exists, otherwise u
- Works for both types of todos

## Cron Schedule

**Runs:** Daily at 9:00 AM EST  
**Purpose:** Send email reminders for todos due in 2 days  
**File:** `/backend/src/services/todoReminderService.js`  
**Scheduled in:** `/backend/src/services/scheduledJobs.js`

## Testing

To manually trigger the reminder job (for testing):
```bash
POST /api/v1/todo-reminders/trigger
```

## Deployment

**Commit:** 5678d89a  
**Date:** 2025-11-04  
**Status:** ✅ Deployed to production

## Impact

✅ Single-assignee todos: Still work (backward compatible)  
✅ Multi-assignee todos: Now work (fixed)  
✅ Each assignee gets their own reminder email  
✅ No duplicate emails (DISTINCT clause)

