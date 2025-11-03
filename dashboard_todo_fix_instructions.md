# Implementation Guide: Fix Missing To-Dos on Dashboard

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix a bug where the Dashboard does not display all of a user's to-dos, even though they appear correctly on the main To-Dos page.

## 2. Root Cause

The root cause is that the Dashboard's to-do filtering logic is incomplete. It only checks for to-dos assigned via the single-assignee field (`assigned_to` or `assigned_to_id`). It does not check for to-dos assigned via the multi-assignee field (`assignees` array), which was recently introduced.

## 3. Implementation Steps for Claude Code

To fix this, you will modify the `userTodos` filter in `Dashboard.jsx` to check both the single-assignee field and the multi-assignee `assignees` array.

**File to Edit:** `frontend/src/pages/Dashboard.jsx`

### Step 1: Locate the `userTodos` Filter

Find the `userTodos` filter, which is located around **line 237**.

### Step 2: Update the Filter Logic

Replace the existing filter logic with the updated code below. This new logic correctly checks both assignment methods.

**Replace this code block:**

```javascript
const userTodos = allTodos.filter(todo => {
  const assignedToId = todo.assignedTo?.id || todo.assigned_to?.id || todo.assigned_to_id;
  const isAssignedToUser = assignedToId === user.id;
  const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
  return isAssignedToUser && isNotCompleted;
});
```

**With this new code block:**

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

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Log in as a user who has to-dos assigned via both single and multi-assignee fields.
3.  Navigate to the **Dashboard**.
4.  **Expected Result:** The "My To-Dos" widget on the Dashboard should now display all of the user's to-dos, matching the list on the main To-Dos page.

---

End of instructions. Please proceed with the implementation.

