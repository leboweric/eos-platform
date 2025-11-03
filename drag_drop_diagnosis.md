# Drag-and-Drop Issue Diagnosis

**Date:** 2025-11-01
**Issue:** Drag-and-drop works moving metrics FROM "Quality Assurance" TO "Josh Ask", but does NOT work moving them back FROM "Josh Ask" TO "Quality Assurance"

## Investigation

### Backend Analysis

The backend `moveMetricToGroup` function in `scorecardGroupsController.js` (line 200) is straightforward:

```javascript
export const moveMetricToGroup = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;
    const { metricId, groupId } = req.body;
    
    const result = await db.query(
      `UPDATE scorecard_metrics
       SET group_id = $1
       WHERE id = $2 AND organization_id = $3 AND team_id = $4
       RETURNING *`,
      [groupId, metricId, orgId, teamId]
    );
    // ...
  }
}
```

**This is a simple UPDATE query that should work in both directions.** There's no logic that would prevent moving a metric back to its original group.

### Frontend Analysis

Looking at `GroupedScorecardView.jsx`:

1. **handleDrop** (line 340):
   ```javascript
   const handleDrop = async (e, groupId) => {
     // ...
     // Skip if dropping in the same group
     if (draggedMetric.group_id === groupId) {
       console.log('Metric already in this group');
       setDraggedMetric(null);
       return;
     }
     
     try {
       await handleMoveMetricToGroup(draggedMetric.id, groupId);
     } catch (error) {
       console.error('Failed to move metric:', error);
     }
     
     setDraggedMetric(null);
   };
   ```

2. **handleMoveMetricToGroup** (line 279):
   ```javascript
   const handleMoveMetricToGroup = async (metricId, groupId) => {
     try {
       console.log('Moving metric', metricId, 'to group', groupId);
       const response = await scorecardGroupsService.moveMetricToGroup(orgId, teamId, metricId, groupId);
       console.log('Move response:', response);
       
       // Update metrics immediately by modifying the group_id
       const updatedMetrics = metrics.map(m => 
         m.id === metricId ? { ...m, group_id: groupId } : m
       );
       
       // Refresh the parent component to get updated metrics
       if (onRefresh) {
         await onRefresh();
       } else {
         // Fallback: reload the page
         window.location.reload();
       }
     } catch (error) {
       console.error('Failed to move metric:', error);
       alert('Failed to move metric. Please try again.');
     }
   }
   ```

## Root Cause Hypothesis

The issue is likely a **state synchronization problem**. Here's what I think is happening:

1. User drags "JD QA Lead Appointments" from "Quality Assurance" to "Josh Ask"
2. The backend successfully updates `group_id` in the database
3. The frontend calls `onRefresh()` to reload the metrics
4. **BUT** the `draggedMetric` state variable still has the OLD `group_id` value

When the user tries to drag the metric back:
1. User drags "JD QA Lead Appointments" (now in "Josh Ask") to "Quality Assurance"
2. The `draggedMetric` state was set during `handleDragStart`
3. **The `draggedMetric.group_id` might still be the old value** (from before the page refresh)
4. The check `if (draggedMetric.group_id === groupId)` incorrectly thinks the metric is already in the target group
5. The function returns early without moving the metric

## Potential Issues

### Issue 1: Stale State in draggedMetric

When `handleDragStart` is called, it sets:
```javascript
setDraggedMetric(metric);
```

But after `onRefresh()` is called, the `metrics` array is updated with new data from the server. However, the `draggedMetric` state variable is NOT updated - it still holds a reference to the OLD metric object with the OLD `group_id`.

### Issue 2: Race Condition

If the user tries to drag the metric again before the page fully refreshes, the `draggedMetric` might have stale data.

## Recommended Fix

Update `handleDragStart` to ensure it always gets the CURRENT metric data from the `metrics` array, not a stale reference:

```javascript
const handleDragStart = (e, metric, index) => {
  // Find the current version of this metric from the metrics array
  const currentMetric = metrics.find(m => m.id === metric.id) || metric;
  setDraggedMetric(currentMetric);
  setDraggedMetricIndex(index);
  e.dataTransfer.effectAllowed = 'move';
};
```

OR, better yet, **remove the early return check** in `handleDrop` that compares `draggedMetric.group_id === groupId`. Let the backend handle this check, or at least use fresh data:

```javascript
const handleDrop = async (e, groupId) => {
  e.preventDefault();
  e.stopPropagation();
  console.log('Drop event - groupId:', groupId, 'draggedMetric:', draggedMetric);
  setDragOverGroup(null);
  
  if (!draggedMetric) {
    console.log('No dragged metric found');
    return;
  }
  
  // Get the current state of the metric from the metrics array
  const currentMetric = metrics.find(m => m.id === draggedMetric.id);
  
  // Skip if dropping in the same group (using current data)
  if (currentMetric && currentMetric.group_id === groupId) {
    console.log('Metric already in this group');
    setDraggedMetric(null);
    return;
  }
  
  try {
    await handleMoveMetricToGroup(draggedMetric.id, groupId);
  } catch (error) {
    console.error('Failed to move metric:', error);
  }
  
  setDraggedMetric(null);
};
```

This ensures we're always checking against the CURRENT state of the metric, not a stale snapshot.

