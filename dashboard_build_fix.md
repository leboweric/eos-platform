# Implementation Guide: Fix Netlify Build Failure

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix the Netlify build failure caused by a duplicate function declaration.

## 2. Root Cause

The build is failing because the `isOverdue` function is declared twice in `frontend/src/pages/DashboardClean.jsx`.

- **First Declaration:** Line 92
- **Duplicate Declaration:** Line 249

This is causing a JavaScript error: `The symbol "isOverdue" has already been declared`.

## 3. Implementation Steps for Claude Code

To fix this, you will remove the duplicate `isOverdue` function from `DashboardClean.jsx`.

**File to Edit:** `frontend/src/pages/DashboardClean.jsx`

### Step 1: Locate the Duplicate Function

Find the duplicate `isOverdue` function, which is located around **line 249**.

### Step 2: Remove the Duplicate Function

Delete the entire function, from line 248 to line 259.

**Remove this entire code block:**

```javascript
// Helper function to check if a todo is overdue
const isOverdue = (todo) => {
  if (!todo.due_date || todo.status === 'complete' || todo.status === 'cancelled') {
    return false;
  }
  const dueDate = new Date(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};
```

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application builds successfully.
2.  Push the changes to GitHub and confirm that the Netlify build passes.

---

End of instructions. This will resolve the build failure.

