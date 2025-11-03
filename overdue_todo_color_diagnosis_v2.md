# Overdue To-Do Color Issue - Code Review

**Date:** 2025-11-01
**Issue:** Overdue to-dos are NOT displaying in red on Dashboard or Level 10 Meeting To-Do List Review section

## Investigation

### Dashboard - TodosList Component

Looking at `/frontend/src/components/todos/TodosList.jsx` (lines 249-323):

**The code DOES have overdue styling:**
- Line 251: `const overdue = isOverdue(todo);`
- Line 263: `borderLeftColor: overdue ? '#EF4444' : ...` - Red left border
- Line 312: `overdue ? 'text-red-600 font-medium'` - Red due date text

**The `isOverdue` function (line 146):**
```javascript
const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete';
};
```

**This looks correct.** So why isn't it working?

### Level 10 Meeting - WeeklyAccountabilityMeetingPage

Looking at `/frontend/src/pages/WeeklyAccountabilityMeetingPage.jsx` (lines 5808-5890):

**The to-do rendering code (lines 5884-5890):**
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

**PROBLEM FOUND!** The due date is ALWAYS rendered with `text-slate-600` (gray color). There is NO logic to check if the to-do is overdue and apply red styling.

### Root Cause

1. **Dashboard (TodosList.jsx)**: The overdue styling code exists, but it might not be working because:
   - The `isOverdue` function might be returning `false` due to date format issues
   - OR the styling is too subtle (only left border and due date text)

2. **Level 10 Meeting (WeeklyAccountabilityMeetingPage.jsx)**: The overdue styling is COMPLETELY MISSING. The due date is always gray, regardless of whether it's overdue.

## Recommended Fix

### For Level 10 Meeting

Add overdue detection and styling to the To-Do List Review section in `WeeklyAccountabilityMeetingPage.jsx`:

1. Add an `isOverdue` helper function (similar to the one in TodosList.jsx)
2. Update the due date rendering to conditionally apply red styling

**Add this helper function near the top of the component:**
```javascript
const parseDateAsLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
  return new Date(year, month - 1, day);
};

const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
};
```

**Update the due date rendering (around line 5884):**
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

### For Dashboard

The TodosList component already has the logic, but we should enhance it to be more visible:

1. Add red background to overdue to-dos
2. Make the title text red for overdue to-dos

This will make overdue to-dos much more prominent.

