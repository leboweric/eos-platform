# Implementation Guide: Enhance Overdue To-Do Styling

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to enhance the styling of overdue to-dos on the Dashboard to make them more prominent.

## 2. Root Cause

The current styling for overdue to-dos is too subtle. It only applies a 4px red left border and colors the due date text red. This is not noticeable enough, especially on a busy dashboard.

## 3. Implementation Steps for Claude Code

To fix this, you will modify the `TodosList.jsx` component to add a light red background to the entire to-do card and make the title text red for overdue to-dos.

**File to Edit:** `frontend/src/components/todos/TodosList.jsx`

### Step 1: Locate the To-Do Card Div

Find the `div` that renders each to-do card, which is located around **line 254**.

### Step 2: Add Overdue Background Styling

Add the `overdue ? 'bg-red-50' : 'bg-white'` class to the `className` string to apply a light red background to overdue to-dos.

**Replace this code block:**

```javascript
<div
  key={todo.id}
  className={`
    group relative bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4
    ${todo.status === 'complete' && !todo.archived ? 'opacity-60' : ''}
    hover:scale-[1.01] hover:-translate-y-0.5
  `}
  style={{
    borderColor: '#e5e7eb',
    borderLeftColor: overdue ? '#EF4444' : (todo.status === 'complete' ? '#9CA3AF' : themeColors.primary), // Dynamic theme color
  }}
  onClick={() => setSelectedTodo(todo)}
>
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
  style={{
    borderColor: '#e5e7eb',
    borderLeftColor: overdue ? '#EF4444' : (todo.status === 'complete' ? '#9CA3AF' : themeColors.primary), // Dynamic theme color
  }}
  onClick={() => setSelectedTodo(todo)}
>
```

### Step 3: Locate the To-Do Title

Find the `h4` element that renders the to-do title, which is located around **line 290**.

### Step 4: Add Overdue Title Styling

Add the `overdue ? 'text-red-700' : 'text-gray-900'` class to the `className` string to make the title text red for overdue to-dos.

**Replace this code block:**

```javascript
<h4 className={`
  text-base font-semibold text-gray-900 mb-2 leading-snug
  ${todo.status === 'complete' ? 'text-gray-400 line-through' : ''}
`}>
  {todo.title}
</h4>
```

**With this new code block:**

```javascript
<h4 className={`
  text-base font-semibold mb-2 leading-snug
  ${todo.status === 'complete' ? 'text-gray-400 line-through' : 
    overdue ? 'text-red-700' : 'text-gray-900'}
`}>
  {todo.title}
</h4>
```

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Log in as a user with an overdue to-do.
3.  Navigate to the **Dashboard**.
4.  **Expected Result:** The overdue to-do should now have a light red background and a red title, making it much more prominent.

---

End of instructions. Please proceed with the implementation.

