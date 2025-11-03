# Implementation Guide: Fix Dashboard To-Do Assignee Bug

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix the bug where editing a to-do's due date from the Dashboard clears the assignee, causing the to-do to become unassigned.

## 2. Root Cause

When editing a to-do from the Dashboard, the `onSave` handler in `DashboardClean.jsx` is not correctly preserving the existing assignee information. It's spreading the `todoData` from the form, but it's not merging it with the original `editingTodo` data. This means that if the assignee wasn't changed in the form, the `assignedToId` field is not sent to the backend, and the backend then clears the assignee.

## 3. Implementation Steps for Claude Code

To fix this, you will merge the `todoData` from the form with the original `editingTodo` data before sending it to the update service.

**File to Edit:** `frontend/src/pages/DashboardClean.jsx`

### Step 1: Locate the `TodoDialog` `onSave` Handler

Find the `onSave` handler for the `TodoDialog`, which is located around **line 2059**.

### Step 2: Modify the `todoDataWithOrgInfo` Object

Inside the `onSave` handler, find the `todoDataWithOrgInfo` object, which is around **line 2066**.

**Change this code block:**

```javascript
const todoDataWithOrgInfo = {
  ...todoData,
  organization_id: orgId,
  team_id: userTeamId,
  department_id: userTeamId
};
```

**To this:**

```javascript
const todoDataWithOrgInfo = {
  ...editingTodo, // Spread the original todo data first
  ...todoData,      // Then spread the new form data
  organization_id: orgId,
  team_id: userTeamId,
  department_id: userTeamId
};
```

By spreading `editingTodo` first, you ensure that all the original to-do's properties (including the assignee) are preserved, and then any changes from the form (`todoData`) will overwrite them.

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Navigate to the **Dashboard**.
3.  Create a new to-do assigned to yourself using the "Add To Do" Quick Action.
4.  Click on the newly created to-do in the "My To-Dos" list.
5.  Change only the **Due Date** and click **Update To-Do**.
6.  **Expected Result:** The to-do should remain in your "My To-Dos" list, and when you check the main To-Dos page, it should still be assigned to you.

---

End of instructions. This will resolve the assignee bug.

