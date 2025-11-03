# Dashboard To-Do Synchronization Debug

**Date:** 2025-11-01
**Issue:** Dashboard shows only 2 of 3 to-dos for Eric, despite the fix being implemented

## Current Code (Dashboard.jsx lines 237-249)

```javascript
const userTodos = allTodos.filter(todo => {
  // Check single assignee field
  const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
  const isAssignedToUser = assignedToId === user.id;

  // Check multi-assignee field
  const isInAssigneesArray = todo.assignees && Array.isArray(todo.assignees) && 
    todo.assignees.some(assignee => assignee.id === user.id);

  const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';

  return (isAssignedToUser || isInAssigneesArray) && isNotCompleted;
});
```

**This code looks correct!** It checks both the single-assignee field and the multi-assignee array.

## Hypothesis

The issue might be with the data structure of the `assignees` array. The filter is checking `assignee.id`, but the actual field might be:
- `assignee.user_id` (instead of `assignee.id`)
- Or some other field name

## Comparison with Level 10 Meeting Code

Looking at `WeeklyAccountabilityMeetingPage.jsx` (lines 5686-5705), which DOES work:

```javascript
if (todo.assignees && todo.assignees.length > 0) {
  todo.assignees.forEach(assignee => {
    const assigneeId = assignee.user_id || assignee.id;  // <-- KEY DIFFERENCE!
    const assigneeName = `${assignee.first_name} ${assignee.last_name}`;
    // ...
  });
}
```

**FOUND IT!** The Level 10 Meeting code checks BOTH `assignee.user_id` and `assignee.id`, but the Dashboard only checks `assignee.id`.

## Root Cause

The `assignees` array items might have the user ID stored in `user_id` field instead of `id` field. The Dashboard filter needs to check both, just like the Level 10 Meeting code does.

## Recommended Fix

Update line 244 in `Dashboard.jsx`:

**Current (broken):**
```javascript
todo.assignees.some(assignee => assignee.id === user.id);
```

**Fixed:**
```javascript
todo.assignees.some(assignee => (assignee.id || assignee.user_id) === user.id);
```

This will check both possible field names for the user ID in the assignees array.

