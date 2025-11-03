# Final Implementation Guide: Fix Dashboard Overdue To-Do Styling

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides the correct instructions for Claude Code to fix the bug where overdue to-dos are not displayed in red on the **Dashboard**.

My previous analysis was incorrect. The Dashboard does **NOT** use the `TodosList.jsx` or `TodosListClean.jsx` components. It renders to-dos with its own inline code inside `DashboardClean.jsx`.

## 2. Root Cause

The inline rendering logic in `DashboardClean.jsx` is missing the overdue styling. The due date is always rendered with a gray color (`text-slate-500`), with no check to see if the to-do is overdue.

**The broken code is in `frontend/src/pages/DashboardClean.jsx` around lines 1843-1847:**

```javascript
{/* Due Date */}
<div className="w-24 text-center">
  <span className="text-xs text-slate-500">
    {dueDate}
  </span>
</div>
```

## 3. Implementation Steps for Claude Code

To fix this, you will add an `isOverdue` helper function and then update the inline rendering logic in `DashboardClean.jsx`.

**File to Edit:** `frontend/src/pages/DashboardClean.jsx`

### Step 1: Add Helper Functions

Add the following helper functions near the top of the `DashboardClean` component, around **line 80**:

```javascript
const parseDateAsLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(num => parseInt(num));
  return new Date(year, month - 1, day);
};

const isOverdue = (todo) => {
  if (!todo.due_date || todo.status === 'complete' || todo.status === 'completed') {
    return false;
  }
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today;
};
```

### Step 2: Update To-Do Mapping Logic

Find the `.map` function that renders the to-do items, which is located around **line 1711**. Add a call to the new `isOverdue` function inside the loop.

**Replace this code block:**

```javascript
{dashboardData.todos.map((todo) => {
  const isComplete = todo.status === 'complete' || todo.status === 'completed';
  const dueDate = todo.due_date ? format(new Date(todo.due_date), 'MMM d') : '';
```

**With this new code block:**

```javascript
{dashboardData.todos.map((todo) => {
  const isComplete = todo.status === 'complete' || todo.status === 'completed';
  const overdue = isOverdue(todo);
  const dueDate = todo.due_date ? format(new Date(todo.due_date), 'MMM d') : '';
```

### Step 3: Update Due Date Styling

Find the due date rendering logic, which is located around **line 1843**. Replace the existing `div` with the updated code below to conditionally apply red styling.

**Replace this code block:**

```javascript
{/* Due Date */}
<div className="w-24 text-center">
  <span className="text-xs text-slate-500">
    {dueDate}
  </span>
</div>
```

**With this new code block:**

```javascript
{/* Due Date */}
<div className="w-24 text-center">
  <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-slate-500'}`}>
    {dueDate}
  </span>
</div>
```

### Step 4: (Optional but Recommended) Update Title Styling

To match the styling on the main To-Dos page, also update the title to be red for overdue items. Find the title rendering logic around **line 1833**.

**Replace this code block:**

```javascript
<div 
  className={`text-sm font-medium cursor-pointer ${
    isComplete ? 'line-through text-slate-400' : 'text-slate-900 hover:text-slate-700'
  }`}
```

**With this new code block:**

```javascript
<div 
  className={`text-sm font-medium cursor-pointer ${
    isComplete ? 'line-through text-slate-400' : 
    overdue ? 'text-red-700 hover:text-red-600' : 'text-slate-900 hover:text-slate-700'
  }`}
```

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Log in as a user with an overdue to-do.
3.  Navigate to the **Dashboard**.
4.  **Expected Result:** The overdue to-do should now have a red due date and a red title.

---

End of instructions. This is the correct fix. Please proceed with the implementation.

