# Dashboard To-Dos Missing Issue - Diagnosis

**Date:** 2025-11-01
**Issue:** Dashboard shows only 2 of 3 to-dos for Eric LeBow, while the To-Dos page shows all 3

## Investigation

### What We Know

From the screenshots:
- **To-Dos Page**: Shows 3 to-dos for Eric LeBow:
  1. "look at internal labor cost - get an answer from Currie" (Due Oct 20)
  2. "Test" (Due Nov 7)
  3. "validate financials with AIOA" (Due Nov 7)

- **Dashboard**: Shows only 2 to-dos for Eric:
  1. "Test" (Due Nov 7)
  2. "validate financials with AIOA" (Due Nov 7)

**Missing:** "look at internal labor cost - get an answer from Currie" (Due Oct 20)

### Code Analysis

Looking at `Dashboard.jsx` (lines 237-242):

```javascript
const userTodos = allTodos.filter(todo => {
  const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
  const isAssignedToUser = assignedToId === user.id;
  const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
  return isAssignedToUser && isNotCompleted;
});
```

**The problem is here:** The Dashboard is checking for `assigned_to` and `assigned_to_id`, but it's NOT checking the `assignees` array!

### Root Cause

The recent fix for the "Unassigned To-Dos" bug involved supporting multi-assignee to-dos. The to-do "look at internal labor cost - get an answer from Currie" was likely assigned using the multi-assignee field (`assignees` array), not the single assignee field (`assigned_to`).

The Dashboard's filter logic only checks:
- `todo.assignedTo?.id`
- `todo.assigned_to?.id`
- `todo.assigned_to_id`

But it does NOT check:
- `todo.assignees` array

### Comparison with To-Dos Page

Looking at the To-Dos page (`TodosListClean.jsx`), we previously fixed the grouping logic to check BOTH:
1. The single `assigned_to` field
2. The `assignees` array

The Dashboard needs the same fix.

## Recommended Fix

Update the `userTodos` filter in `Dashboard.jsx` (around line 237) to check BOTH the single assignee field AND the `assignees` array:

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

This ensures that to-dos assigned via EITHER method will appear on the Dashboard.

