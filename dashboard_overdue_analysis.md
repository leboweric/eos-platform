# Dashboard Overdue To-Do Styling - Analysis

**Date:** 2025-11-01
**Issue:** Overdue to-dos are not showing in red on the Dashboard

## Current State in GitHub

### Dashboard Component (`Dashboard.jsx`)

**Line 15:** Imports `TodosList` component
```javascript
import TodosList from '../components/todos/TodosList';
```

**Line 667:** Renders the `TodosList` component
```javascript
<TodosList
  todos={dashboardData.todos}
  onEdit={handleEditTodo}
  onDelete={() => {}}
  onUpdate={fetchDashboardData}
  showCompleted={false}
/>
```

### TodosList Component (`TodosList.jsx`)

**Lines 259, 264, 294:** Already has overdue styling implemented
- Line 259: `${overdue ? 'bg-red-50' : 'bg-white'}` - Red background
- Line 264: `borderLeftColor: overdue ? '#EF4444' : ...` - Red left border
- Line 294: `overdue ? 'text-red-700' : 'text-gray-900'` - Red title text

**Lines 146-151:** `isOverdue` function
```javascript
const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
};
```

### TodosListClean Component (`TodosListClean.jsx`)

**Lines 360-362, 394-396:** Has overdue styling implemented
- Line 361: `overdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'` - Red background
- Line 396: `overdue ? 'text-red-700' : 'text-slate-900'` - Red title text

**Lines 215-223:** `isOverdue` function
```javascript
const isOverdue = (todo) => {
  if (!todo.due_date || todo.status === 'complete' || todo.status === 'completed' || todo.status === 'cancelled') {
    return false;
  }
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today;
};
```

## Analysis

### The Code is Correct

Both `TodosList.jsx` and `TodosListClean.jsx` have the overdue styling implemented correctly. The Dashboard uses `TodosList.jsx`, which has:
1. Red background (`bg-red-50`)
2. Red left border (`#EF4444`)
3. Red title text (`text-red-700`)

### Why It's Not Working

The issue is likely one of the following:

1. **Browser Cache:** The user's browser has cached the old version of the component
2. **Build Issue:** The frontend hasn't been rebuilt with the latest changes
3. **Component Mismatch:** The Dashboard might be using a different component than expected

## Verification Steps

To verify which component the Dashboard is actually using, we need to check:
1. Is the Dashboard using `Dashboard.jsx` or `DashboardClean.jsx`?
2. Which `TodosList` component is being imported?

Let me check the routing to see which Dashboard component is being used.

