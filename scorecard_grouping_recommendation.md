# Architectural Recommendation: Scorecard Metric Grouping UX

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Overview

This document provides an architectural recommendation for improving the user experience of moving metrics between groups on the Scorecard page. The current implementation has two key issues:

1.  **No way to move metrics:** The UI allows creating new groups, but there is no mechanism to move metrics into them.
2.  **Stale group list:** The metric edit dialog does not show newly created groups because the group list is not refreshed.

## 2. Recommended Solution

I recommend a two-pronged approach:

1.  **Enable Drag-and-Drop:** Implement drag-and-drop functionality to allow users to move metrics between groups intuitively.
2.  **Fix the Group Dropdown:** Ensure the group dropdown in the metric edit dialog is always up-to-date.

### 2.1. Enable Drag-and-Drop

The `GroupedScorecardView` component already has the necessary drag-and-drop event handlers (`handleDragStart`, `handleDragEnter`, `handleDragEnd`, etc.). However, they are not fully wired up to update the metric's group assignment.

**Implementation:**

1.  **Update `handleDragEnd`:** In `GroupedScorecardView.jsx`, modify the `handleDragEnd` function to call the `handleMoveMetricToGroup` function when a metric is dropped on a new group.
2.  **Visual Feedback:** Enhance the drag-and-drop experience with visual cues, such as highlighting the drop target group.

### 2.2. Fix the Group Dropdown

The `ScorecardPage` component fetches the list of groups in `fetchGroups`, but it is not re-fetching this list after a new group is created in the `GroupedScorecardView` component.

**Implementation:**

1.  **Lift State Up:** Move the `groups` state and the `fetchGroups` function from `ScorecardPage.jsx` to a shared context or a higher-level component that both `ScorecardPage` and `GroupedScorecardView` can access.
2.  **Refresh on Create/Update:** After a group is created or updated in `GroupedScorecardView`, call the `fetchGroups` function to refresh the list.

## 3. Implementation Steps for Claude Code

Here are the detailed steps for Claude Code to implement the recommended solution.

### Step 1: Implement Drag-and-Drop Logic

This step will enable the drag-and-drop functionality to move metrics between groups.


**File:** `frontend/src/components/scorecard/GroupedScorecardView.jsx`

**Action:** Modify the `handleDragEnd` function.

*   **Find:**
    ```javascript
    const handleDragEnd = () => {
      setDraggedMetric(null);
      setDragOverGroup(null);
    };
    ```
*   **Replace with:**
    ```javascript
    const handleDragEnd = async () => {
      if (draggedMetric && dragOverGroup) {
        await handleMoveMetricToGroup(draggedMetric.id, dragOverGroup);
      }
      setDraggedMetric(null);
      setDragOverGroup(null);
    };
    ```

### Step 2: Fix the Group Dropdown

This step will ensure that the group dropdown in the metric edit dialog is always up-to-date with the latest groups.


**File:** `frontend/src/pages/ScorecardPage.jsx`

**Action:** In `ScorecardPage.jsx`, find where `GroupedScorecardView` is rendered (around line 474 and 517) and pass the `fetchGroups` function as a prop named `onRefreshGroups`.

*   **Find (around line 474):**
    ```javascript
    <GroupedScorecardView
      metrics={weeklyMetrics}
      ...
    />
    ```
*   **Add:**
    ```javascript
    <GroupedScorecardView
      metrics={weeklyMetrics}
      ...
      onRefreshGroups={fetchGroups} // Add this line
    />
    ```

*   **Find (around line 517):**
    ```javascript
    <GroupedScorecardView
      metrics={monthlyMetrics}
      ...
    />
    ```
*   **Add:**
    ```javascript
    <GroupedScorecardView
      metrics={monthlyMetrics}
      ...
      onRefreshGroups={fetchGroups} // Add this line
    />
    ```

*   **Find (around line 474):**
    ```javascript
    <GroupedScorecardView
      metrics={weeklyMetrics}
      ...
    />
    ```
*   **Add:**
    ```javascript
    <GroupedScorecardView
      metrics={weeklyMetrics}
      ...
      onRefreshGroups={fetchGroups} // Add this line
    />
    ```

**File:** `frontend/src/components/scorecard/GroupedScorecardView.jsx`

**Action:** In `GroupedScorecardView.jsx`, find the `handleCreateGroup` function (around line 239) and add a call to `onRefreshGroups` after a new group is created. You also need to add `onRefreshGroups` to the component's props.

*   **Find (around line 25):**
    ```javascript
    const GroupedScorecardView = ({ 
      metrics, 
      ...
      scorecardTimePeriodPreference = '13_week_rolling'
    }) => {
    ```
*   **Add:**
    ```javascript
    const GroupedScorecardView = ({ 
      metrics, 
      ...
      scorecardTimePeriodPreference = '13_week_rolling',
      onRefreshGroups // Add this line
    }) => {
    ```

*   **Find:** The `handleCreateGroup` function (around line 239).
*   **Add:**
    ```javascript
    const handleCreateGroup = async () => {
      try {
        const newGroup = await scorecardGroupsService.createGroup(orgId, teamId, {
          name: newGroupName,
          color: newGroupColor || themeColors.primary,
          type: type || 'both'
        });
        setGroups([...groups, newGroup]);
        setNewGroupName('');
        setNewGroupColor('');
        setGroupDialog({ isOpen: false, group: null });
        if (onRefreshGroups) { // Add this block
          onRefreshGroups();
        }
      } catch (error) {
        console.error('Failed to create group:', error);
      }
    };
    ```

*   **Find:** The `handleCreateGroup` function (around line 239).
*   **Add:**
    ```javascript
    const handleCreateGroup = async () => {
      try {
        const newGroup = await scorecardGroupsService.createGroup(orgId, teamId, {
          name: newGroupName,
          color: newGroupColor || themeColors.primary,
          type: type || 'both'
        });
        setGroups([...groups, newGroup]);
        setNewGroupName('');
        setNewGroupColor('');
        setGroupDialog({ isOpen: false, group: null });
        if (onRefreshGroups) { // Add this block
          onRefreshGroups();
        }
      } catch (error) {
        console.error('Failed to create group:', error);
      }
    };
    ```

## 4. Conclusion

By implementing these changes, we will provide a much-improved user experience for managing Scorecard metric groupings. Users will be able to intuitively drag and drop metrics, and the group dropdown will always be up-to-date. This addresses both the immediate bug reported by the customer and the underlying UX issues.

