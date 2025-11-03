'''
# Implementation Guide: Add Debugging to Dashboard To-Do Updates

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to add `console.log` statements to the Dashboard to help diagnose why the assignee is being cleared when a to-do is updated.

We need to see the data at each step of the `onSave` handler in `DashboardClean.jsx`.

## 2. Implementation Steps for Claude Code

**File to Edit:** `frontend/src/pages/DashboardClean.jsx`

### Step 1: Locate the `TodoDialog` `onSave` Handler

Find the `onSave` handler for the `TodoDialog`, which is located around **line 2059**.

### Step 2: Add `console.log` Statements

Add the following `console.log` statements inside the `onSave` handler's `try` block:

```javascript
onSave={async (todoData) => {
  try {
    console.log("--- DEBUGGING TODO UPDATE ---");
    console.log("1. editingTodo (original data):", editingTodo);
    console.log("2. todoData (from form):", todoData);

    // Add organization_id and team_id if not present
    const orgId = user?.organizationId || user?.organization_id;
    
    const userTeamId = getEffectiveTeamId(selectedDepartment?.id, user);
    
    const todoDataWithOrgInfo = {
      ...editingTodo, // Spread the original todo data first
      ...todoData,      // Then spread the new form data
      organization_id: orgId,
      team_id: userTeamId,
      department_id: userTeamId
    };

    console.log("3. todoDataWithOrgInfo (final payload):", todoDataWithOrgInfo);
    
    let savedTodo;
    if (editingTodo) {
      console.log(`4. Calling updateTodo with id: ${editingTodo.id}`);
      savedTodo = await todosService.updateTodo(editingTodo.id, todoDataWithOrgInfo);
      console.log("5. updateTodo response:", savedTodo);
    } else {
      // ... create logic ...
    }
    
    await fetchDashboardData();
    setShowTodoDialog(false);
    setEditingTodo(null);
    console.log("--- END DEBUGGING ---");
    return savedTodo; // Return the todo so attachments can be uploaded
  } catch (error) {
    console.error('Failed to save todo:', error);
    console.error("Error details:", error.response?.data);
    console.log("--- END DEBUGGING WITH ERROR ---");
    // Don't close the dialog on error
    throw error; // Re-throw to let TodoDialog handle it
  }
}}
```

## 3. Verification Steps

After implementing the changes, please perform the following steps and provide the **full console log output**:

1.  Ensure the application has been rebuilt and deployed.
2.  Navigate to the **Dashboard**.
3.  Create a new to-do assigned to yourself using the "Add To Do" Quick Action.
4.  Click on the newly created to-do in the "My To-Dos" list.
5.  Change only the **Due Date**.
6.  Click **Update To-Do**.
7.  Capture the entire console log from the browser's developer tools.

This will give us the information we need to find the root cause of the bug.

---

End of instructions.
'''
