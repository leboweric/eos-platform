# Implementation Guide: Fix for Unassigned To-Do Bug

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This guide provides the detailed implementation steps for fixing a bug where assigned to-dos are incorrectly showing up in the "Unassigned" group on the To-Dos page. The root cause is that the grouping logic does not account for the `assignees` array (for multi-assignee to-dos).

### Root Cause Analysis

The system supports two types of to-do assignments:

1.  **Single assignee:** Stored in the `todo.assigned_to` object.
2.  **Multi-assignee:** Stored in the `todo.assignees` array.

The grouping logic in `TodosListClean.jsx` only checks for `todo.assigned_to` and ignores the `assignees` array. When a to-do is assigned using the multi-assignee field, it has:

-   `assigned_to`: null
-   `assignees`: `[{id, first_name, last_name, email}]`

Since `assigned_to` is null, the grouping logic incorrectly treats it as "Unassigned".

## 2. Implementation Steps

Please have Claude Code follow these steps precisely.

### Step 1: Update the Grouping Logic

We need to modify the grouping logic in the `TodosListClean` component to correctly identify the assignee.

**File:** `frontend/src/components/todos/TodosListClean.jsx`

**Action:** Find the `renderGroupedView` function and replace the assignee extraction logic (lines 239-242).

*   **Find:**
    ```javascript
    const assigneeId = todo.assigned_to?.id || 'unassigned';
    const assigneeName = todo.assigned_to ? 
      `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}` : 
      'Unassigned';
    ```
*   **Replace with:**
    ```javascript
    let assigneeId = 'unassigned';
    let assigneeName = 'Unassigned';

    if (todo.assignees && todo.assignees.length > 0) {
      // Use the first assignee from the multi-assignee array
      assigneeId = todo.assignees[0].id;
      assigneeName = `${todo.assignees[0].first_name} ${todo.assignees[0].last_name}`;
    } else if (todo.assigned_to) {
      // Fallback to the single assignee field
      assigneeId = todo.assigned_to.id;
      assigneeName = `${todo.assigned_to.first_name} ${todo.assigned_to.last_name}`;
    }
    ```

## 3. Conclusion

After completing this change, the grouping logic will correctly handle both single-assignee and multi-assignee to-dos. The to-do assigned to "Eric LeBow" will now appear under his name instead of in the "Unassigned" group.

### Expected Outcome

-   To-dos assigned via the multi-assignee field will be correctly grouped under the first assignee's name.
-   The "Unassigned" group will only contain to-dos that have no assignee in either the `assigned_to` or `assignees` fields.
-   The bug will be resolved, and all to-dos will be displayed under the correct assignee.

