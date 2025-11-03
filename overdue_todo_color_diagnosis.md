# Overdue To-Do Color Issue - Diagnosis

**Date:** 2025-11-01
**Issue:** Overdue to-dos are not displaying in red on the Dashboard

## Investigation

### What We Know

From the screenshot:
- Bo Bennett has a to-do: "Follow with Jaycie - Unit records, removing maintenance contract checkbox"
- Due date: Sep 10 (overdue by almost 2 months)
- The to-do is NOT showing in red on the Dashboard

### Code Analysis

The Dashboard uses the `TodosList` component to render to-dos. Looking at `TodosList.jsx` (lines 249-264), I can see that the component DOES have logic to color overdue to-dos:

```javascript
{sortedTodos.map((todo, index) => {
  const daysUntilDue = getDaysUntilDue(todo);
  const overdue = isOverdue(todo);
  
  return (
    <div
      key={todo.id}
      className={`...`}
      style={{
        borderColor: '#e5e7eb',
        borderLeftColor: overdue ? '#EF4444' : (todo.status === 'complete' ? '#9CA3AF' : themeColors.primary),
      }}
    >
```

**The styling IS there!** The left border should be red (`#EF4444`) when `overdue` is true.

### Root Cause Analysis

Let me check the `isOverdue` function (line 146):

```javascript
const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete';
};
```

This looks correct. It should return `true` for overdue to-dos.

Let me check the `parseDateAsLocal` function (line 139):

```javascript
const parseDateAsLocal = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
  return new Date(year, month - 1, day); // month is 0-indexed in JS
};
```

This also looks correct.

### Possible Issues

1. **The styling might be working, but the red left border is too subtle**
   - The red color is only applied to the LEFT BORDER (4px wide)
   - This might not be noticeable enough

2. **The due date text color IS red** (lines 311-316):
   ```javascript
   {todo.due_date && (
     <span className={`flex items-center gap-1 ${
       overdue ? 'text-red-600 font-medium' : 
       getDaysUntilDue(todo) === 0 ? 'text-orange-600 font-medium' :
       getDaysUntilDue(todo) === 1 ? 'text-yellow-600' :
       'text-slate-500'
     }`}>
   ```
   
   But looking at the screenshot, the due date text "Sep 10" is NOT in red - it appears to be in gray.

### Hypothesis

The most likely issue is that the `overdue` variable is evaluating to `false` when it should be `true`. This could happen if:

1. The `todo.due_date` field is not in the expected format
2. The `todo.status` is set to 'complete' (but the screenshot shows it's not checked)
3. There's a timezone issue with date parsing

Let me check the actual data structure. Looking at the Dashboard code (line 155), it fetches todos with:

```javascript
todosService.getTodos(null, null, true, userDepartmentId)
```

The third parameter `includeCompleted = true` means it fetches completed to-dos as well. But the filter at line 240 should exclude completed ones:

```javascript
const isNotCompleted = todo.status !== 'completed' && todo.status !== 'complete';
```

Wait - there's an inconsistency! The filter checks for both `'completed'` and `'complete'`, but the `isOverdue` function only checks for `'complete'`:

```javascript
return dueDate && dueDate < today && todo.status !== 'complete';
```

**This might be the issue!** If the backend returns `status: 'completed'` (with 'ed'), the `isOverdue` function won't exclude it, but it also won't be filtered out by the Dashboard's filter.

Actually, looking more carefully at the Dashboard filter (line 240), it should already exclude completed to-dos before they reach the `TodosList` component. So this shouldn't be the issue.

### Most Likely Root Cause

After reviewing the code more carefully, I believe the issue is that **the styling IS working**, but it's too subtle. The red color is only applied to:
1. The left border (4px wide)
2. The due date text

Looking at the screenshot again, I can see that the due date text says "Sep 10" but it's NOT in red. This suggests that the `overdue` variable is evaluating to `false`.

The most likely reason is a **date format mismatch**. The `parseDateAsLocal` function expects the date in `YYYY-MM-DD` format, but the backend might be returning it in a different format or with timezone information.

## Recommended Fix

Add console logging to debug the issue, or enhance the red styling to make it more obvious:

1. **Make the entire card background slightly red for overdue to-dos**
2. **Make the title text red for overdue to-dos**
3. **Add an overdue badge/icon**

Here's the recommended change to `TodosList.jsx`:

```javascript
<div
  key={todo.id}
  className={`
    group relative rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4
    ${todo.status === 'complete' && !todo.archived ? 'opacity-60' : ''}
    ${overdue ? 'bg-red-50' : 'bg-white'}  // Add red background for overdue
    hover:scale-[1.01] hover:-translate-y-0.5
  `}
  style={{
    borderColor: '#e5e7eb',
    borderLeftColor: overdue ? '#EF4444' : (todo.status === 'complete' ? '#9CA3AF' : themeColors.primary),
  }}
  onClick={() => setSelectedTodo(todo)}
>
```

And update the title styling:

```javascript
<h4 className={`
  text-base font-semibold mb-2 leading-snug
  ${todo.status === 'complete' ? 'text-gray-400 line-through' : 
    overdue ? 'text-red-700' : 'text-gray-900'}  // Make title red for overdue
`}>
  {todo.title}
</h4>
```

