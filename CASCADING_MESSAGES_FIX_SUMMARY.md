# Cascading Messages Snapshot Fix

## Problem

Cascading messages were not appearing in Meeting History snapshots despite being visible during the meeting and sent from the frontend.

## Root Cause

The backend was **overwriting** the `cascadingMessages` data sent from the frontend with a database query that had different filtering logic.

### The Bug Flow

1. **Frontend** collected cascading messages and sent them in request body:
   ```javascript
   cascadingMessages: [{...}]  // Length: 1
   ```

2. **Backend received** the data correctly:
   ```
   📦 [Backend] Received cascadingMessages: [...]
   📦 [Backend] cascadingMessages type: object
   📦 [Backend] cascadingMessages length: 1
   ```

3. **Backend then overwrote** it with a database query (lines 602-632):
   ```javascript
   let cascadingMessages = [];  // ❌ Overwrites request body data
   // ... database query with meeting_date = CURRENT_DATE filter
   ```

4. **Result:** Empty array saved to snapshot:
   ```
   cascadingMessages: 0
   "cascadingMessages": []
   ```

## The Fix

**Removed the database query** that was overwriting the frontend data.

### Before (lines 601-632)
```javascript
// Fetch cascading messages from today for this specific team
let cascadingMessages = [];
try {
  const cascadeQuery = `
    SELECT cm.id, cm.message, ...
    FROM cascading_messages cm
    WHERE cm.organization_id = $1
    AND cm.from_team_id = $2
    AND cm.meeting_date = CURRENT_DATE  // ❌ Wrong filter
    ...
  `;
  const cascadeResult = await db.query(cascadeQuery, [organizationId, teamId]);
  cascadingMessages = cascadeResult.rows.map(...);  // ❌ Overwrites frontend data
} catch (cascadeError) {
  logger.error('Failed to fetch cascading messages:', cascadeError);
}
```

### After (lines 601-603)
```javascript
// Cascading messages are now sent from frontend in request body
// No need to query database - use the snapshot data from frontend
// (cascadingMessages variable is already defined from req.body destructuring above)
```

## Why This Approach is Correct

This matches the pattern used for **headlines**, which are also:
1. Collected by the frontend during the meeting
2. Sent in the request body
3. Used directly by the backend (not queried from database)

The frontend knows which cascading messages were **actually displayed** during the meeting, which is what should be captured in the snapshot.

## Testing

After deploying this fix:

1. **Start a meeting** with cascading messages from other teams
2. **Conclude the meeting** 
3. **Check Meeting History** - cascading messages should now appear
4. **Backend logs** should show:
   ```
   📦 [Backend] Received cascadingMessages: [...]
   📦 [Backend] cascadingMessages length: 1
   ✅ [Snapshot Filter] Final snapshot data: { ..., cascadingMessages: 1 }
   ```

## Related Commits

- `036487ae` - Main fix: Stop overwriting cascadingMessages
- `7ef51945` - Debug logging to diagnose the issue
- `e50a8f88` - Original feature: Add cascading messages to snapshots

## Impact

✅ **Cascading messages now captured in snapshots**  
✅ **Matches headline behavior (frontend-driven)**  
✅ **Accurate meeting history**  
✅ **7-day auto-expiration still works** (separate cron job)
