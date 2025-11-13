# Issues Components Architecture Guide

**Last Updated:** November 12, 2025

## ⚠️ IMPORTANT: Which Components Are Actually Used in Production

### Main Issues Page (`/issues`)

**Route:** `/issues`  
**Page Component:** `IssuesPageClean.jsx` (imported as `IssuesPage` in App.jsx line 41)  
**List Component:** `IssuesListClean.jsx`

**Layout:** Table-style list view with columns (DRAG, STATUS, ISSUE, OWNER, CREATED)

**Key Features:**
- Drag to reorder by priority
- Checkbox for status toggle
- Issue number (#1, #2, etc.)
- Issue title with inline paperclip icon for attachments
- Owner name in separate column
- Created date in separate column
- Right-click context menu

**Attachment Indicator:** 
- Location: Inline with issue title
- Format: `📎 2` (paperclip icon + count)
- Code: Line 709-714 in `IssuesListClean.jsx`

---

### L10 Meetings (90-minute and 60-minute)

**Pages:** 
- `WeeklyAccountabilityMeetingPage.jsx` (90-minute)
- `WeeklyAccountabilityExpressMeetingPage.jsx` (60-minute)

**List Component:** `IssuesListClean.jsx`

**Same layout and features as main Issues page**

---

### Archived Issues

**Component:** `ArchivedIssuesList.jsx`

**Layout:** Card-based list view with metadata rows

**Attachment Indicator:**
- Location: In metadata row below title
- Format: `📎 2` (paperclip icon + count)
- Code: Line 166-169 in `ArchivedIssuesList.jsx`

---

## Component Inventory

### 1. `IssuesListClean.jsx` ✅ **PRODUCTION**

**Used By:**
- Main Issues page (`/issues`)
- L10 90-minute meeting
- L10 60-minute meeting  
- Annual planning meeting
- Quarterly planning meeting

**Layout:** Table-style with columns

**Attachment Support:** ✅ Yes (inline with title)

**Real-time Sync:**
- ✅ Issue creation
- ✅ Issue updates (auto-save every 2 seconds)
- ✅ Headlines archiving
- ✅ Milestone changes

---

### 2. `IssuesList.jsx` ❌ **NOT USED IN PRODUCTION**

**Used By:** Legacy/backup pages only

**Layout:** Card-based with metadata rows

**Attachment Support:** ✅ Yes (in metadata row)

**Note:** This component was modified during debugging but is NOT used in production. Changes here won't appear on the live site.

---

### 3. `ArchivedIssuesList.jsx` ✅ **PRODUCTION**

**Used By:** Archived tab on Issues page

**Layout:** Card-based with metadata rows

**Attachment Support:** ✅ Yes (in metadata row)

---

### 4. `IssuesListOriginal.jsx` ❌ **NOT USED**

**Used By:** None (legacy backup)

**Status:** Deprecated

---

## Page Routing

```javascript
// App.jsx line 41-42
const IssuesPage = lazy(() => import('./pages/IssuesPageClean'));  // ← PRODUCTION
const IssuesPageOriginal = lazy(() => import('./pages/IssuesPageOriginal'));  // ← BACKUP

// App.jsx line 242-243
<Route path="/issues" element={<IssuesPage />} />  // ← Uses IssuesPageClean
<Route path="/issues-original" element={<IssuesPageOriginal />} />  // ← Backup route
```

---

## How to Modify Issues Display

### To modify the main Issues page (`/issues`):

1. **Edit:** `frontend/src/components/issues/IssuesListClean.jsx`
2. **Test:** Navigate to `/issues` in the app
3. **Deploy:** Push to main branch → Netlify auto-deploys

### To modify L10 meeting issues:

1. **Edit:** `frontend/src/components/issues/IssuesListClean.jsx` (same component!)
2. **Test:** Start a L10 meeting
3. **Deploy:** Push to main branch → Netlify auto-deploys

### To modify archived issues:

1. **Edit:** `frontend/src/components/issues/ArchivedIssuesList.jsx`
2. **Test:** Navigate to `/issues` → Archived tab
3. **Deploy:** Push to main branch → Netlify auto-deploys

---

## Common Pitfalls

### ❌ DON'T modify `IssuesList.jsx` expecting changes on `/issues`

The main Issues page uses `IssuesListClean.jsx`, not `IssuesList.jsx`.

### ❌ DON'T assume `IssuesPage.jsx` is the production page

The route imports `IssuesPageClean.jsx` as `IssuesPage` (see App.jsx line 41).

### ✅ DO check App.jsx to see which page component is actually routed

```bash
grep -n "IssuesPage" frontend/src/App.jsx
```

### ✅ DO check the browser DevTools Sources tab to confirm which component is loaded

Search for unique text (e.g., "Drag to reorder by priority") to identify the component.

---

## Attachment Indicator Implementation

### Backend

**File:** `backend/src/controllers/issuesController.js`

**Query:** Line 69
```sql
COUNT(DISTINCT ia.id)::integer as attachment_count
```

**Response:** Line 128
```javascript
attachment_count: parseInt(issue.attachment_count) || 0
```

**Returns:** Integer (e.g., `2`), not string (`"2"`)

### Frontend

**IssuesListClean.jsx** (main Issues page):
```javascript
// Line 709-714
{issue.attachment_count > 0 && (
  <>
    <Paperclip className="h-4 w-4 inline ml-2 text-slate-400" />
    <span className="text-xs text-slate-400 ml-1">{issue.attachment_count}</span>
  </>
)}
```

**ArchivedIssuesList.jsx**:
```javascript
// Line 166-169
{issue.attachment_count > 0 && (
  <>
    <Paperclip className="h-4 w-4" />
    <span className="text-xs ml-1">{issue.attachment_count}</span>
  </>
)}
```

---

## Real-Time Sync (WebSocket)

### Events Broadcast

1. **Headlines Archiving** ✅
   - Event: `headlines-archived`
   - Broadcast: After archiving headlines
   - Handler: Refreshes headlines list

2. **Issue Updates** ✅
   - Event: `issue-updated`
   - Broadcast: Every 2 seconds during auto-save
   - Handler: Updates issue in list

3. **Issue Creation** ✅
   - Event: `issue-created`
   - Broadcast: After creating issue
   - Handler: Adds issue to list

4. **Milestone Changes** ✅
   - Event: `milestone-added`, `milestone-edited`, `milestone-toggled`
   - Broadcast: After milestone action
   - Handler: Updates issue milestones

### Implementation

**Backend:** `backend/src/controllers/issuesController.js`

**Frontend:**
- Meeting pages: `useMeeting.js` hook
- Issue dialog: `IssueDialog.jsx` (auto-save function)

---

## Testing Checklist

When modifying Issues components:

- [ ] Test main Issues page (`/issues`)
- [ ] Test Short Term tab
- [ ] Test Long Term tab  
- [ ] Test Archived tab
- [ ] Test L10 90-minute meeting
- [ ] Test L10 60-minute meeting
- [ ] Test with attachments (paperclip shows)
- [ ] Test without attachments (no paperclip)
- [ ] Test real-time sync (open in 2 browsers)
- [ ] Test on mobile/tablet (responsive layout)

---

## Version History

| Date | Change | Commit |
|------|--------|--------|
| 2025-11-12 | Fixed attachment indicator in IssuesListClean | `e003b197` |
| 2025-11-12 | Cast attachment_count to integer in SQL | `ad786ba9` |
| 2025-11-12 | Added real-time sync for issue editing | `0a03ae70` |
| 2025-11-12 | Added real-time sync for headlines archiving | `0a03ae70` |
| 2025-11-12 | Added user name to transfer messages | `20ab7634` |
| 2025-11-12 | Fixed error state in Edit Issue dialog | `c9a9e760` |

---

## Contact

For questions about this architecture, contact the development team or refer to this guide.

**Last verified working:** November 12, 2025
