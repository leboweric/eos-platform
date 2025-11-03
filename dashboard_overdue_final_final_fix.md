# Final Implementation Guide: Fix Dashboard Overdue To-Do Styling (v3)

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides the **final and correct** instructions for Claude Code to fix the bug where overdue to-dos are not displayed in red on the **Dashboard**.

My previous analysis was correct that the styling needed to be added inline to `DashboardClean.jsx`. However, the last code push was incomplete.

## 2. Root Cause Analysis

I have reviewed the latest code in the live GitHub repository. The `isOverdue` helper function and the `overdue` variable **were correctly added**. 

However, the JSX code that renders the due date and title was **not updated to use the `overdue` variable**. The styling remains hardcoded to gray.

### The Broken Code (Live in `DashboardClean.jsx`)

**Due Date (Lines 1864-1868):** The `<span>` is always `text-slate-500`.
```javascript
<div className="w-24 text-center">
  <span className="text-xs text-slate-500"> // <-- ALWAYS GRAY
    {dueDate}
  </span>
</div>
```

**Title (Lines 1854-1856):** The `className` does not check for the `overdue` variable.
```javascript
className={`text-sm font-medium cursor-pointer ${
  isComplete ? 'line-through text-slate-400' : 'text-slate-900 hover:text-slate-700'
}`}
```

## 3. Implementation Steps for Claude Code

To fix this, you will modify the JSX in `DashboardClean.jsx` to use the `overdue` variable that is already being calculated.

**File to Edit:** `frontend/src/pages/DashboardClean.jsx`

### Step 1: Update Due Date Styling

Find the due date rendering logic around **line 1864**. Replace the existing `div` with the updated code below to conditionally apply red styling.

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

### Step 2: Update Title Styling

Find the title rendering logic around **line 1853**. Replace the existing `div` with the updated code below to conditionally apply red styling.

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
4.  **Expected Result:** The overdue to-do should now have a **red due date** and a **red title**.

---

End of instructions. This is the correct and complete fix. Please proceed with the implementation.

