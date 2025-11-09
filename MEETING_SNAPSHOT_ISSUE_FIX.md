# Meeting History Snapshot - Issue Categorization Fix

## Problem Statement

After fixing the archiving order bug, To-Dos were displaying correctly in Meeting History, but Issues were still not showing up despite being captured in the backend.

### Root Cause

The backend was saving `issues` as a **flat array**, but the Meeting History frontend expected issues to be structured as an **object** with separate `new` and `solved` categories:

**Backend was saving:**
```javascript
issues: [
  { title: "Issue 1", is_solved: false, created_at: "..." },
  { title: "Issue 2", is_solved: true, resolved_at: "..." }
]
```

**Frontend expected:**
```javascript
issues: {
  new: [{ title: "Issue 1", created_at: "..." }],
  solved: [{ title: "Issue 2", resolved_at: "..." }]
}
```

The Meeting History page's normalization logic (line 582-598) assumed that a flat array meant all issues were "created", so it was putting everything into `issuesCreated` and leaving `issuesSolved` empty.

## Solution Implemented

### Backend Changes

Modified `backend/src/controllers/meetingsController.js` to categorize issues into `new` and `solved` categories:

**Before:**
```javascript
let filteredIssues = issues || [];
if (meetingStartTime && issues && Array.isArray(issues)) {
  filteredIssues = issues.filter(issue => {
    // Include if created OR resolved during meeting
    if (issue.created_at >= meetingStart) return true;
    if (issue.is_solved && issue.resolved_at >= meetingStart) return true;
    return false;
  });
}

const snapshotData = {
  issues: filteredIssues,  // Flat array
  todos: filteredTodos,
  // ...
};
```

**After:**
```javascript
let filteredIssues = { new: [], solved: [] };
if (meetingStartTime && issues && Array.isArray(issues)) {
  issues.forEach(issue => {
    let includedAsNew = false;
    
    // Check if created during meeting
    if (issue.created_at >= meetingStart) {
      filteredIssues.new.push(issue);
      includedAsNew = true;
    }
    
    // Check if resolved during meeting (only if not already added as new)
    if (!includedAsNew && issue.is_solved && issue.resolved_at >= meetingStart) {
      filteredIssues.solved.push(issue);
    }
  });
}

const snapshotData = {
  issues: filteredIssues,  // Object with 'new' and 'solved' categories
  todos: filteredTodos,
  // ...
};
```

### Key Logic

1. **New Issues:** Issues with `created_at >= meeting start time`
2. **Solved Issues:** Issues with `is_solved = true` AND `resolved_at >= meeting start time`
3. **Exclusion:** An issue created AND solved during the same meeting only appears in "New Issues" (to avoid duplication)

### Updated Logging

```javascript
console.log(`🔍 [Snapshot Filter] Issues: ${originalCount} → ${filteredIssues.new.length} new + ${filteredIssues.solved.length} solved`);

console.log('✅ [Snapshot Filter] Final snapshot data:', {
  todosAdded: filteredTodos.added?.length || 0,
  todosCompleted: filteredTodos.completed?.length || 0,
  issuesNew: filteredIssues.new?.length || 0,
  issuesSolved: filteredIssues.solved?.length || 0
});
```

## Expected Behavior After Fix

When users conclude a meeting and view Meeting History:

### Issues Section:
- ✅ **New Issues:** Shows all issues created during the meeting
- ✅ **Solved Issues:** Shows all issues resolved during the meeting
- ✅ **Proper Categorization:** Issues appear in the correct section

### To-Dos Section (already fixed):
- ✅ **New To-Dos:** Shows all todos created during the meeting
- ✅ **Completed To-Dos:** Shows all todos completed during the meeting

## Testing Instructions

### Test Scenario:
1. Start a meeting (90-minute or Express)
2. During the meeting:
   - **Create 2 new issues** (e.g., "Test Issue 1", "Test Issue 2")
   - **Resolve 1 existing issue** (mark as solved)
   - **Create 2 new todos**
   - **Complete 1 existing todo**
3. Conclude meeting with "Archive completed items" enabled
4. Navigate to Meeting History and open the meeting summary

### Expected Results:
- **New Issues:** Shows the 2 issues created during meeting ✅
- **Solved Issues:** Shows the 1 issue resolved during meeting ✅
- **New To-Dos:** Shows the 2 todos created during meeting ✅
- **Completed To-Dos:** Shows the 1 todo completed during meeting ✅

## Files Modified

### Backend:
- `backend/src/controllers/meetingsController.js` (lines 865-917)

### Frontend:
- No changes required (already compatible with object structure)

## Deployment Notes

- ✅ Backend deployment required to apply fix
- ✅ No database migration required
- ✅ No frontend changes required
- ✅ Backward compatible: Frontend already handles both array and object structures
- ⚠️ Existing snapshots with flat arrays will still display (all as "New Issues")
- ✅ New snapshots will have proper categorization

## Related Commits

1. **Frontend archiving fix:** `976125db` - "fix: Move archiving after meeting snapshot to capture all items"
2. **Backend Issue categorization:** `85f62002` - "fix: Categorize issues into 'new' and 'solved' in meeting snapshots"

---

**Fix Date:** November 9, 2025  
**Fixed By:** Manus AI Assistant  
**Status:** Ready for backend deployment ✅
