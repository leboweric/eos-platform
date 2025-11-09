# New Features Documentation - November 9, 2025

## Overview

This document describes two new enhancements added to the AXP/EOS platform's meeting pages (both 90-minute and Express meetings).

---

## Feature 1: Overdue To-Do Highlighting

### Problem
Overdue To-Dos on the Conclude Meeting page were showing in blue instead of red, making it difficult for users to identify which items needed immediate attention.

### Root Cause
The `isOverdue()` function was being called incorrectly. The function expects a `todo` object as a parameter, but the code was passing only `todo.due_date` (a string).

**Incorrect code:**
```javascript
isOverdue(todo.due_date) ? 'text-red-600' : 'text-blue-600'
```

**Correct code:**
```javascript
isOverdue(todo) ? 'text-red-600' : 'text-blue-600'
```

### Solution
Fixed the function call in 4 locations:
- 90-minute meeting: Lines 6754 (assignee view) and 6798 (regular list view)
- Express meeting: Lines 6739 (assignee view) and 6783 (regular list view)

### User Impact
- ✅ Overdue To-Dos now display in **red** on the Conclude Meeting page
- ✅ Non-overdue To-Dos display in **blue**
- ✅ Users can quickly identify which action items need immediate attention
- ✅ Works in both "Sort by Owner" and "Sort by Due Date" views

### Files Modified
- `frontend/src/pages/WeeklyAccountabilityMeetingPage.jsx`
- `frontend/src/pages/WeeklyAccountabilityExpressMeetingPage.jsx`

---

## Feature 2: Archive Viewing for Headlines and Cascading Messages

### Problem
Users had no way to view archived Headlines and Cascading Messages after they were archived. Once items were archived, they were effectively invisible unless accessed through Meeting History snapshots.

### Solution
Added a comprehensive archive viewing feature with the following components:

#### 1. Backend Enhancement - Cascading Messages
**File**: `backend/src/controllers/cascadingMessagesController.js`

Added `includeArchived` query parameter support to the `getCascadingMessages` controller:

```javascript
const { startDate, endDate, includeArchived } = req.query;

// In date range query
${includeArchived === 'true' ? '' : 'AND cmr.deleted_at IS NULL'}

// In recent messages query  
${includeArchived === 'true' ? '' : 'AND cmr.deleted_at IS NULL'}
```

**Note**: Headlines controller already had `includeArchived` support (line 11).

#### 2. Frontend Service Enhancement
**File**: `frontend/src/services/cascadingMessagesService.js`

Updated `getCascadingMessages` method to accept `includeArchived` parameter:

```javascript
async getCascadingMessages(orgId, teamId, startDate = null, endDate = null, includeArchived = false) {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (includeArchived) params.includeArchived = 'true';
  // ...
}
```

#### 3. UI Components Added

**A. State Management**

Added three new state variables to both meeting pages:

```javascript
const [showArchiveModal, setShowArchiveModal] = useState(false);
const [archivedHeadlines, setArchivedHeadlines] = useState({ customer: [], employee: [] });
const [archivedMessages, setArchivedMessages] = useState([]);
```

**B. View Archive Button**

Added a new button on the Headlines page (next to "Send Cascading Message"):

```javascript
<Button
  onClick={async () => {
    try {
      const effectiveTeamId = getEffectiveTeamId(teamId, user);
      const orgId = user?.organizationId || user?.organization_id;
      
      // Fetch archived headlines
      const headlinesResponse = await headlinesService.getHeadlines(effectiveTeamId, true);
      const archived = headlinesResponse.data || [];
      setArchivedHeadlines({
        customer: archived.filter(h => h.type === 'customer'),
        employee: archived.filter(h => h.type === 'employee')
      });
      
      // Fetch archived cascading messages
      const messagesResponse = await cascadingMessagesService.getCascadingMessages(orgId, effectiveTeamId, null, null, true);
      setArchivedMessages(messagesResponse.data || []);
      
      setShowArchiveModal(true);
    } catch (error) {
      console.error('Failed to fetch archived items:', error);
      setError('Failed to load archived items');
    }
  }}
  variant="outline"
  className="text-slate-700 border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
>
  <Archive className="h-4 w-4" />
  View Archive
</Button>
```

**C. Archive Modal Component**

Created a full-screen modal overlay with:
- **Header**: Title with Archive icon and close button
- **Content**: Two sections:
  1. **Archived Headlines**: Split into Customer and Employee columns
  2. **Archived Cascading Messages**: List of all archived messages
- **Footer**: Close button

**Modal Features**:
- Responsive design (max-width: 4xl)
- Scrollable content area (max-height: 80vh)
- Backdrop blur effect
- Displays timestamps for all items
- Shows message sender information for cascading messages
- Empty state messages when no archived items exist

### User Experience

#### How to Access Archive
1. Navigate to the Headlines section of any meeting (90-minute or Express)
2. Click the **"View Archive"** button (next to "Send Cascading Message")
3. Modal opens showing all archived items

#### What Users See

**Archived Headlines Section**:
- Split into two columns: Customer Headlines and Employee Headlines
- Each headline shows:
  - Headline text
  - Creation timestamp (e.g., "Nov 9, 2025 4:30 PM")
- Count displayed in section header

**Archived Cascading Messages Section**:
- List of all archived messages
- Each message shows:
  - Message text
  - Sender team name (e.g., "From: Leadership Team")
  - Creation timestamp
- Count displayed in section header

#### Closing the Modal
- Click the **X** button in the top-right corner
- Click the **"Close"** button at the bottom
- Press **Escape** key (browser default behavior)

### User Impact
- ✅ Users can now view all archived Headlines and Cascading Messages
- ✅ Archive is accessible from both 90-minute and Express meetings
- ✅ No need to search through Meeting History to find archived items
- ✅ Clean, organized display with timestamps and sender information
- ✅ Separate sections for Customer vs Employee headlines
- ✅ Easy to close and reopen as needed

### Files Modified
- `backend/src/controllers/cascadingMessagesController.js` - Added includeArchived support
- `frontend/src/services/cascadingMessagesService.js` - Added includeArchived parameter
- `frontend/src/pages/WeeklyAccountabilityMeetingPage.jsx` - Added View Archive button and modal
- `frontend/src/pages/WeeklyAccountabilityExpressMeetingPage.jsx` - Added View Archive button and modal

---

## Feature Parity

Both features have been implemented identically in:
- ✅ 90-minute Weekly Accountability Meeting
- ✅ 60-minute Express Meeting

This ensures consistent user experience across all meeting types.

---

## Technical Details

### Overdue To-Do Logic

The `isOverdue` function (defined at the top of both meeting pages):

```javascript
const isOverdue = (todo) => {
  const dueDate = parseDateAsLocal(todo.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate && dueDate < today && todo.status !== 'complete' && todo.status !== 'completed';
};
```

**Logic**:
1. Parse the due date as local time
2. Get today's date at midnight
3. Check if due date is before today AND todo is not completed
4. Return true (overdue) or false (not overdue)

### Archive Data Model

**Headlines**:
- Stored in `headlines` table
- Soft delete using `archived` boolean field
- Filtered by `team_id` for security

**Cascading Messages**:
- Stored in `cascading_messages` and `cascading_message_recipients` tables
- Soft delete using `deleted_at` timestamp on recipients
- Filtered by recipient team ID
- Auto-expire after 7 days (via cron job)

### API Endpoints Used

**Get Archived Headlines**:
```
GET /api/v1/organizations/:orgId/headlines?teamId=:teamId&includeArchived=true
```

**Get Archived Cascading Messages**:
```
GET /api/v1/organizations/:orgId/teams/:teamId/cascading-messages?includeArchived=true
```

---

## Testing Recommendations

### Test Overdue To-Do Highlighting

1. Create a To-Do with a due date in the past
2. Navigate to the Conclude Meeting page
3. Verify the To-Do shows with red text for the due date
4. Create a To-Do with a future due date
5. Verify it shows with blue text for the due date
6. Test both "Sort by Owner" and "Sort by Due Date" views

### Test Archive Viewing

1. **Setup**: Create and archive some headlines and cascading messages
   - Add customer headlines and archive them
   - Add employee headlines and archive them
   - Send cascading messages and archive them (or wait 7 days for auto-archive)

2. **Test Archive Access**:
   - Navigate to Headlines section
   - Click "View Archive" button
   - Verify modal opens

3. **Test Archive Display**:
   - Verify archived customer headlines appear in left column
   - Verify archived employee headlines appear in right column
   - Verify archived cascading messages appear in bottom section
   - Verify all timestamps are correct
   - Verify sender information is correct for messages

4. **Test Modal Interactions**:
   - Click X button to close
   - Reopen modal
   - Click Close button to close
   - Verify modal can be reopened multiple times

5. **Test Empty States**:
   - Test with no archived headlines
   - Test with no archived messages
   - Verify appropriate "No archived..." messages appear

6. **Test Both Meeting Types**:
   - Repeat all tests in 90-minute meeting
   - Repeat all tests in Express meeting
   - Verify identical behavior

---

## Deployment Information

**Commit**: `11436d19`  
**Date**: November 9, 2025  
**Branch**: `main`  
**Status**: ✅ Deployed to production

---

## Future Enhancements (Optional)

Potential improvements for future consideration:

1. **Restore from Archive**: Add ability to unarchive items
2. **Search/Filter**: Add search functionality within archive modal
3. **Date Range Filter**: Filter archived items by date range
4. **Export Archive**: Export archived items to CSV or PDF
5. **Archive Analytics**: Show statistics about archived items
6. **Bulk Operations**: Select and restore multiple items at once

---

## Support

For questions or issues related to these features:
- Review this documentation
- Check the Feature Parity Audit Report
- Review git commit history for detailed changes
- Contact development team for technical support

---

**Documentation Version**: 1.0  
**Last Updated**: November 9, 2025  
**Author**: Development Team
