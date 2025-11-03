# Implementation Guide: Fix Scorecard Drag-and-Drop

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides instructions for Claude Code to fix a bug where scorecard metrics can be dragged and dropped to a new group, but cannot be moved back to their original group.

## 2. Root Cause

The issue is caused by a **stale state** problem. When a metric is dragged, its data is stored in the `draggedMetric` state variable. After the metric is dropped and the page refreshes, this `draggedMetric` variable is not updated, and it retains the old `group_id`. When you try to drag the metric back, the code incorrectly thinks the metric is already in the target group and cancels the operation.

## 3. Implementation Steps for Claude Code

To fix this, you will modify the `handleDrop` function in `GroupedScorecardView.jsx` to ensure it always uses the most current metric data.

**File to Edit:** `frontend/src/components/scorecard/GroupedScorecardView.jsx`

### Step 1: Locate the `handleDrop` Function

Find the `handleDrop` function, which is located around **line 340**.

### Step 2: Update the `handleDrop` Function

Replace the existing `handleDrop` function with the updated code below. This new logic fetches the current state of the metric before checking if it's already in the target group.

**Replace this code block:**

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

**With this new code block:**

```javascript
  const handleDrop = async (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverGroup(null);

    if (!draggedMetric) {
      return;
    }

    // Find the most up-to-date version of the metric from the metrics array
    const currentMetric = metrics.find(m => m.id === draggedMetric.id);

    // If the metric is already in the target group, do nothing
    if (currentMetric && currentMetric.group_id === groupId) {
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

## 4. Verification Steps

After implementing the changes, please verify the fix by following these steps:

1.  Ensure the application has been rebuilt and deployed.
2.  Navigate to the **Scorecard** page.
3.  Drag a metric from its original group to a new group.
4.  Drag the same metric back to its original group.
5.  **Expected Result:** The metric should move back to its original group without any issues.

---

End of instructions. Please proceed with the implementation.

