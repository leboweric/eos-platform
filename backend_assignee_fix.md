# Implementation Guide: Fix Backend To-Do Assignee Bug

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix the bug in the backend that clears the assignee when a to-do is updated from the Dashboard.

## 2. Root Cause

The debugging logs have confirmed that the frontend is sending the correct data, but the backend is incorrectly clearing the `assigned_to_id`.

The bug is in `backend/src/controllers/todosController.js` in the `updateTodo` function.

**The Problem:**

When updating a to-do, the frontend sends `assignedToIds: []` (an empty array) if it's a single-assignee to-do.

The backend code at **line 293** checks `if (assignedToIds !== undefined)`.

This condition is **TRUE** because an empty array is not `undefined`. This causes the code to enter the multi-assignee block and execute **line 295**:

```javascript
updates.push(`assigned_to_id = NULL`);
```

This incorrectly clears the assignee.

## 3. Implementation Steps for Claude Code

To fix this, you will modify the condition to check if `assignedToIds` is a non-empty array.

**File to Edit:** `backend/src/controllers/todosController.js`

### Step 1: Locate the `updateTodo` Function

Find the `updateTodo` function, which is around **line 254**.

### Step 2: Modify the Assignee Update Logic

Find the assignee update logic, which starts around **line 290**.

**Change this code block (lines 293-305):**

```javascript
if (assignedToIds !== undefined) {
  // Switching to multi-assignee mode
  updates.push(`assigned_to_id = NULL`);
  updates.push(`is_multi_assignee = TRUE`);
  
  // We'll handle the junction table after the main update
} else if (assignedToId !== undefined) {
  // Single assignee mode
  updates.push(`assigned_to_id = $${paramIndex}`);
  values.push(assignedToId);
  paramIndex++;
  updates.push(`is_multi_assignee = FALSE`);
}
```

**To this:**

```javascript
if (Array.isArray(assignedToIds) && assignedToIds.length > 0) {
  // Switching to multi-assignee mode
  updates.push(`assigned_to_id = NULL`);
  updates.push(`is_multi_assignee = TRUE`);
  
  // We'll handle the junction table after the main update
} else if (assignedToId !== undefined && assignedToId !== null && assignedToId !== 

) {
  // Single assignee mode
  updates.push(`assigned_to_id = $${paramIndex}`);
  values.push(assignedToId);
  paramIndex++;
  updates.push(`is_multi_assignee = FALSE`);
}
```

**Explanation of Changes:**

1.  `if (Array.isArray(assignedToIds) && assignedToIds.length > 0)`: This ensures we only enter multi-assignee mode if `assignedToIds` is an array with at least one ID.
2.  `else if (assignedToId !== undefined && assignedToId !== null && assignedToId !== 

)`: This makes the single-assignee check more robust, preventing it from running if `assignedToId` is an empty string or null.

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the backend has been rebuilt and deployed.
2.  Navigate to the **Dashboard**.
3.  Create a new to-do assigned to yourself using the "Add To Do" Quick Action.
4.  Click on the newly created to-do in the "My To-Dos" list.
5.  Change only the **Due Date** and click **Update To-Do**.
6.  **Expected Result:** The to-do should remain in your "My To-Dos" list, and when you check the main To-Dos page, it should still be assigned to you.

---

End of instructions. This will resolve the backend assignee bug.

