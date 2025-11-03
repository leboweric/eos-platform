# Final Fix: React Error #31 in MeetingSummaryModal

**Author:** Manus AI (Architect)
**Date:** 2025-11-01
**Status:** Ready for Implementation

---

## 1. Root Cause

The `MeetingSummaryModal` is crashing with **React error #31** ("Objects are not valid as a React child") because it is trying to render an entire **issue object** instead of the issue's **title**.

The backend is correctly sending an array of issue objects, e.g., `[{id: 1, title: "Fix the login button"}]`, but the frontend code is doing this:

```javascript
// Incorrect - Renders the whole object
<ListItem>{issue}</ListItem> 
```

Instead of this:

```javascript
// Correct - Renders just the title string
<ListItem>{issue.title}</ListItem> 
```

## 2. Implementation Instructions

Please have Claude Code make the following changes to `frontend/src/components/MeetingSummaryModal.jsx`.

### Step 1: Fix Solved Issues Rendering

*   **Find line 375:**
    ```javascript
    <ListItem key={idx} completed={true}>{issue}</ListItem>
    ```
*   **Change it to:**
    ```javascript
    <ListItem key={idx} completed={true}>{issue.title}</ListItem>
    ```

### Step 2: Fix New Issues Rendering

*   **Find line 392:**
    ```javascript
    <ListItem key={idx}>{issue}</ListItem>
    ```
*   **Change it to:**
    ```javascript
    <ListItem key={idx}>{issue.title}</ListItem>
    ```

### Step 3: Fix To-Do Rendering (Proactive)

Let's also fix the to-do rendering to prevent the same bug from happening there.

*   **Find line 416 (Completed To-Dos):**
    ```javascript
    <ListItem key={idx} completed={true}>{todo}</ListItem>
    ```
*   **Change it to:**
    ```javascript
    <ListItem key={idx} completed={true}>{todo.title}</ListItem>
    ```

*   **Find line 433 (New To-Dos):**
    ```javascript
    <ListItem key={idx}>{todo}</ListItem>
    ```
*   **Change it to:**
    ```javascript
    <ListItem key={idx}>{todo.title}</ListItem>
    ```

### Step 4: Commit and Push

Commit and push these changes to GitHub.

```bash
git add frontend/src/components/MeetingSummaryModal.jsx
git commit -m "FIX: Render issue.title instead of issue object in modal"
git push
```

## 3. Summary

This fix will resolve the React error #31 crash by correctly rendering the `title` property of the issue and to-do objects instead of the objects themselves.

After these changes are deployed, the modal should open without crashing and display the issue and to-do titles correctly.
