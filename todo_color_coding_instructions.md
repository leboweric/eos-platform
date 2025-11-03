# Implementation Guide: Color-Coded To-Do Due Dates



**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This guide provides the detailed implementation steps for adding color-coded due dates to the 'My To-Dos' list on the dashboard. The due date will turn yellow if it is 2 days away and red if it is overdue.

## 2. Implementation Steps

Please have Claude Code follow these steps precisely.

### Step 1: Modify the `isOverdue` Function

First, we need to ensure the `isOverdue` function correctly identifies overdue to-dos.

**File:** `frontend/src/components/todos/TodosList.jsx`

**Action:** The existing `isOverdue` function (lines 146-151) is already correct. No changes are needed here.

### Step 2: Modify the `getDaysUntilDue` Function

Next, we need to ensure the `getDaysUntilDue` function is accurate.

**File:** `frontend/src/components/todos/TodosList.jsx`

**Action:** The existing `getDaysUntilDue` function (lines 153-161) is also correct. No changes are needed here.

### Step 3: Update the Due Date Styling

Now, we will update the conditional styling for the due date.

**File:** `frontend/src/components/todos/TodosList.jsx`

**Action:** Find the `span` element that renders the due date (around line 311) and modify its `className`.

*   **Find:**
    ```javascript
    <span className={`flex items-center gap-1 ${
      overdue ? 'text-red-600 font-medium' : 
      getDaysUntilDue(todo) === 0 ? 'text-orange-600 font-medium' :
      getDaysUntilDue(todo) === 1 ? 'text-yellow-600' :
      'text-slate-500'
    }`}>
    ```
*   **Replace with:**
    ```javascript
    <span className={`flex items-center gap-1 ${
      isOverdue(todo) ? 'text-red-600 font-medium' : 
      getDaysUntilDue(todo) <= 2 ? 'text-yellow-600 font-medium' :
      'text-slate-500'
    }`}>
    ```

### Step 4: Update the Due Date Text

Finally, let's update the text to be more consistent.

**File:** `frontend/src/components/todos/TodosList.jsx`

**Action:** Find the text rendering inside the `span` (around line 318) and modify it.

*   **Find:**
    ```javascript
    {overdue ? formatDueDate(todo) : 
     getDaysUntilDue(todo) === 0 ? 'Today' :
     getDaysUntilDue(todo) === 1 ? 'Tomorrow' :
     format(parseDateAsLocal(todo.due_date), 'MMM d')}
    ```
*   **Replace with:**
    ```javascript
    {formatDueDate(todo)}
    ```

## 3. Conclusion

After completing these steps, the due dates in the 'My To-Dos' list will be color-coded as follows:

-   **Red:** If the to-do is overdue.
-   **Yellow:** If the to-do is due in 2 days or less (including today and tomorrow).
-   **Default color:** For all other to-dos.

The text will also be more consistent, showing relative dates like "Due today", "Due tomorrow", or "1 day overdue".

