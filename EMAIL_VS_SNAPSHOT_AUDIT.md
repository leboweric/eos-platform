# Email vs. Meeting History Snapshot Audit

**Date**: November 9, 2025  
**Purpose**: Ensure meeting summary email matches Meeting History snapshot exactly

---

## Data Sources Compared

### 1. Meeting History Snapshot (Frontend)
**File**: `frontend/src/components/MeetingSummaryModal.jsx`  
**Lines**: 200-437

### 2. Meeting Summary Email (Backend)
**File**: `backend/src/services/emailService.js`  
**Function**: `generateMeetingSummaryHTML`  
**Lines**: 76-486

---

## Section-by-Section Comparison

### ✅ 1. Executive Summary / AI Summary
**Snapshot**: Shows `aiSummary` in gray box with border  
**Email**: Shows `aiSummary` in gray box with border  
**Status**: ✅ **MATCH**

---

### ❌ 2. Headlines

**Snapshot Display**:
- **Combined list** of customer + employee headlines
- No separation between customer and employee
- Simple bullet list format
- Code:
```javascript
const customerHeadlines = summaryData.headlines.customer || [];
const employeeHeadlines = summaryData.headlines.employee || [];
headlinesArray = [...customerHeadlines, ...employeeHeadlines];
```

**Email Display**:
- **Separated sections** for customer and employee
- "Customer/External Headlines" subsection
- "Employee/Internal Headlines" subsection
- Code:
```javascript
${headlines.customer?.length > 0 ? `
  <div class="subsection">
    <div class="subsection-title">Customer/External Headlines</div>
    ...
  </div>
` : ''}

${headlines.employee?.length > 0 ? `
  <div class="subsection">
    <div class="subsection-title">Employee/Internal Headlines</div>
    ...
  </div>
` : ''}
```

**Status**: ❌ **MISMATCH**  
**Issue**: Email separates customer/employee, snapshot combines them

---

### ✅ 3. Cascading Messages

**Snapshot Display**:
- Combined list of all cascading messages
- Shows message text
- Shows sender info if available

**Email Display**:
- Combined list of all cascading messages
- Shows message text
- Shows "From:" info if available

**Status**: ✅ **MATCH**

---

### ✅ 4. Issues

**Snapshot Display**:
- Two-column layout
- Left: "Solved Issues"
- Right: "New Issues"
- Shows issue title
- Solved issues have checkmark and strikethrough

**Email Display**:
- Two-column table layout
- Left: "Solved Issues"
- Right: "New Issues"
- Shows issue title
- Shows owner if available

**Status**: ✅ **MATCH** (minor styling difference acceptable for email)

---

### ✅ 5. To-Dos

**Snapshot Display**:
- Two-column layout
- Left: "Completed"
- Right: "New To-Dos"
- Shows todo title
- Completed todos have checkmark and strikethrough

**Email Display**:
- Two-column table layout
- Left: "Completed To-Dos"
- Right: "New To-Dos"
- Shows todo title
- Shows assignee and due date

**Status**: ✅ **MATCH** (email shows more detail which is good)

---

### ⚠️ 6. Meeting Rating

**Snapshot Display**:
- **NOT SHOWN** in the snapshot modal

**Email Display**:
- Shows rating with stars (★★★★★)
- Shows numeric rating (X/10)

**Status**: ⚠️ **EMAIL HAS EXTRA**  
**Issue**: Email shows rating, snapshot doesn't

---

## Summary of Discrepancies

### Critical Issues

1. **Headlines Separation** ❌
   - **Snapshot**: Combined customer + employee headlines in one list
   - **Email**: Separated into "Customer/External" and "Employee/Internal" subsections
   - **Fix Required**: Email should combine headlines like snapshot does

### Minor Issues

2. **Meeting Rating** ⚠️
   - **Snapshot**: Does not display rating
   - **Email**: Shows rating with stars
   - **Decision Needed**: Should snapshot show rating, or should email hide it?

---

## Recommended Fixes

### Fix 1: Combine Headlines in Email (HIGH PRIORITY)

**Current Email Code** (Lines 336-368):
```javascript
${(headlines.customer?.length > 0 || headlines.employee?.length > 0) ? `
  <div class="section">
    <h2 class="section-title">Headlines</h2>
    
    ${headlines.customer?.length > 0 ? `
      <div class="subsection">
        <div class="subsection-title">Customer/External Headlines</div>
        <ul class="list">...</ul>
      </div>
    ` : ''}
    
    ${headlines.employee?.length > 0 ? `
      <div class="subsection">
        <div class="subsection-title">Employee/Internal Headlines</div>
        <ul class="list">...</ul>
      </div>
    ` : ''}
  </div>
` : ''}
```

**Proposed Fix**:
```javascript
${(() => {
  const allHeadlines = [
    ...(headlines.customer || []),
    ...(headlines.employee || [])
  ];
  
  return allHeadlines.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Headlines</h2>
      <ul class="list">
        ${allHeadlines.map(headline => `
          <li>
            <div class="list-item-title">${headline.headline || headline.title || headline.text || headline}</div>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';
})()}
```

### Fix 2: Meeting Rating Consistency (MEDIUM PRIORITY)

**Option A**: Remove rating from email to match snapshot
**Option B**: Add rating to snapshot to match email

**Recommendation**: Remove from email (snapshot is the source of truth)

---

## Testing Checklist

After fixes:
- [ ] Send test meeting summary email
- [ ] View same meeting in Meeting History
- [ ] Verify Headlines section matches exactly
- [ ] Verify all other sections match
- [ ] Verify no extra/missing information

---

## Additional Notes

### Data Structure Consistency

Both email and snapshot handle the same data structure:
```javascript
{
  teamName: string,
  meetingType: string,
  meetingDate: string,
  aiSummary: string,
  headlines: {
    customer: [],
    employee: []
  },
  cascadingMessages: [],
  issues: {
    solved: [],
    new: []
  },
  todos: {
    completed: [],
    new: []
  }
}
```

This is good - the issue is just in how headlines are displayed.

---

**Conclusion**: Email needs to combine headlines into a single list to match the snapshot display exactly.
