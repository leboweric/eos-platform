# Implementation Guide: Fix Overdue To-Do Styling

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix a bug where overdue to-dos are not displayed in red on the **Dashboard** and in the **Level 10 Meeting To-Do List Review** section.

## 2. Root Cause

There are two separate issues:

1.  **Level 10 Meeting:** The styling for overdue to-dos is completely missing.
2.  **Dashboard:** The styling exists but is too subtle to be easily noticed.

This guide will provide instructions to fix both issues.

## 3. Implementation Steps for Claude Code

### Part 1: Add Overdue Styling to Level 10 Meeting

**File to Edit:** `frontend/src/pages/WeeklyAccountabilityMeetingPage.jsx`

#### Step 1.1: Add Helper Functions

Add the following helper functions near the top of the `WeeklyAccountabilityMeetingPage` component, around **line 100**:

```javascript
const parseDateAsLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(num => parseInt(num));
  return new Date(year, month - 1, day);
};

const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
};
```

#### Step 1.2: Update Due Date Rendering

Find the due date rendering logic, which is located around **line 5884**. Replace the existing `div` with the updated code below to conditionally apply red styling.

**Replace this code block:**

```javascript
{/* Due Date */}
<div className="w-20 text-right">
  {todo.due_date && (
    <span className="text-sm text-slate-600">
      {formatDateSafe(todo.due_date, 'MMM d')}
    </span>
  )}
</div>
```

**With this new code block:**

```javascript
{/* Due Date */}
<div className="w-20 text-right">
  {todo.due_date && (
    <span className={`text-sm font-medium ${
      isOverdue(todo) ? 'text-red-600' : 'text-slate-600'
    }`}>
      {formatDateSafe(todo.due_date, 'MMM d')}
    </span>
  )}
</div>
```

### Part 2: Enhance Overdue Styling on Dashboard

**File to Edit:** `frontend/src/components/todos/TodosList.jsx`

#### Step 2.1: Add Overdue Background Styling

Find the `div` that renders each to-do card (around **line 254**) and add the `overdue ? 'bg-red-50' : 'bg-white'` class to apply a light red background to overdue to-dos.

**Replace this code block:**

```javascript
<div
  key={todo.id}
  className={`
    group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4
    ${todo.status === 'complete' && !todo.archived ? 'opacity-60' : ''}
    hover:scale-[1.01] hover:-translate-y-0.5
  `}
```

**With this new code block:**

```javascript
<div
  key={todo.id}
  className={`
    group relative rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4
    ${todo.status === 'complete' && !todo.archived ? 'opacity-60' : ''}
    ${overdue ? 'bg-red-50' : 'bg-white'}
    hover:scale-[1.01] hover:-translate-y-0.5
  `}
```

#### Step 2.2: Add Overdue Title Styling

Find the `h4` element that renders the to-do title (around **line 290**) and add the `overdue ? 'text-red-700' : 'text-gray-900'` class to make the title text red for overdue to-dos.

**Replace this code block:**

```javascript
<h4 className={`
  text-base font-semibold text-gray-900 mb-2 leading-snug
  ${todo.status === 'complete' ? 'text-gray-400 line-through' : ''}
`}>
```

**With this new code block:**

```javascript
<h4 className={`
  text-base font-semibold mb-2 leading-snug
  ${todo.status === 'complete' ? 'text-gray-400 line-through' : 
    overdue ? 'text-red-700' : 'text-gray-900'}
`}>
```

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Log in as a user with an overdue to-do.
3.  Navigate to the **Dashboard** and verify that the overdue to-do has a light red background and a red title.
4.  Navigate to a **Level 10 Meeting** and go to the **To-Do List Review** section. Verify that the overdue to-do has a red due date.

---

End of instructions. Please proceed with the implementation.

