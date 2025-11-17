# Testing Instructions: Scorecard Variable Summary Feature

## Overview
This document provides step-by-step testing instructions for the new variable summary attribute feature for scorecard metrics.

## Prerequisites
- Backend deployed (Railway)
- Frontend deployed (Netlify)
- Database migration completed
- Access to a test organization with scorecard metrics

## Test Scenarios

### Test 1: Create Metric with Different Summary Types

**Objective:** Verify that metrics can be created with different summary types.

**Steps:**
1. Navigate to the main Scorecard page
2. Click "+ Add Metric" button
3. Fill in metric details:
   - Name: "Test Quarterly Revenue"
   - Goal: 400000
   - Owner: Select a team member
   - Frequency: Weekly
   - **Summary Display: Quarterly Total**
4. Click "Save"
5. Verify the metric appears in the scorecard

**Expected Result:**
- Metric is created successfully
- Summary Display dropdown shows "Quarterly Total" when editing the metric

**Repeat for all summary types:**
- Weekly Average
- Monthly Average
- Quarterly Total
- Quarterly Average
- Latest Value

---

### Test 2: Edit Existing Metric Summary Type

**Objective:** Verify that existing metrics can have their summary type changed.

**Steps:**
1. Navigate to the main Scorecard page
2. Click the Edit (pencil) icon on an existing metric
3. Change the "Summary Display" dropdown to a different value
4. Click "Save"
5. Verify the change is saved

**Expected Result:**
- Summary type is updated
- Summary column recalculates based on new type

---

### Test 3: Verify Summary Calculations

**Objective:** Verify that each summary type calculates correctly.

#### Test 3a: Weekly Average
1. Create a metric with "Weekly Average" summary type
2. Add scores for multiple weeks (e.g., 100, 200, 300)
3. Check the summary column

**Expected Result:** Summary shows average: (100 + 200 + 300) / 3 = 200

#### Test 3b: Quarterly Total
1. Create a metric with "Quarterly Total" summary type
2. Add scores for multiple weeks (e.g., 100, 200, 300)
3. Check the summary column

**Expected Result:** Summary shows total: 100 + 200 + 300 = 600

#### Test 3c: Latest Value
1. Create a metric with "Latest Value" summary type
2. Add scores for multiple weeks (e.g., 100 on Week 1, 200 on Week 2, 300 on Week 3)
3. Check the summary column

**Expected Result:** Summary shows latest: 300

---

### Test 4: Summary Display in Main Scorecard

**Objective:** Verify summary column displays correctly on main Scorecard page.

**Steps:**
1. Navigate to the main Scorecard page
2. View the summary column (rightmost column)
3. Verify each metric shows:
   - Summary value
   - Goal value (below, in smaller text)
   - Format: "value / goal"

**Expected Result:**
- Summary values are calculated correctly per metric
- Color-coded: green if goal met, red if not
- Compact display format

---

### Test 5: Summary Display in 90-Minute L10 Meeting

**Objective:** Verify summary column displays correctly in 90-minute meetings.

**Steps:**
1. Start a 90-minute L10 meeting
2. Navigate to the "Scorecard Review" section
3. View the summary column
4. Verify each metric shows:
   - Summary value in colored badge (green/red)
   - "Goal: X" below
   - Percentage: "(81%)"

**Expected Result:**
- Summary values match main Scorecard page
- Enhanced display with goal and percentage
- Color-coded badges

---

### Test 6: Summary Display in 60-Minute L10 Meeting

**Objective:** Verify summary column displays correctly in 60-minute meetings.

**Steps:**
1. Start a 60-minute L10 meeting
2. Navigate to the "Scorecard Review" section
3. View the summary column
4. Verify display matches 90-minute meeting

**Expected Result:**
- Summary values match main Scorecard page
- Same enhanced display as 90-minute meeting

---

### Test 7: Backward Compatibility

**Objective:** Verify existing metrics without summary_type work correctly.

**Steps:**
1. Check existing metrics created before the feature
2. Verify they display summaries correctly
3. Edit an old metric and verify "Weekly Average" is selected by default

**Expected Result:**
- Old metrics default to "Weekly Average"
- Summaries calculate correctly
- No errors or missing data

---

### Test 8: Edge Cases

#### Test 8a: Metric with No Scores
1. Create a new metric
2. Don't add any scores
3. Check summary column

**Expected Result:** Summary shows "-" (dash)

#### Test 8b: Metric with Partial Data
1. Create a metric with "Quarterly Total"
2. Add scores for only 2 weeks out of 13
3. Check summary column

**Expected Result:** Summary shows total of available scores

#### Test 8c: Metric with Zero Goal
1. Create a metric with goal = 0
2. Add scores
3. Check summary column

**Expected Result:** Summary shows value, no percentage (division by zero handled)

---

## Validation Checklist

- [ ] All 5 summary types can be selected in the metric form
- [ ] Summary calculations are correct for each type
- [ ] Summary display works in main Scorecard page
- [ ] Summary display works in 90-minute L10 meetings
- [ ] Summary display works in 60-minute L10 meetings
- [ ] Existing metrics default to "Weekly Average"
- [ ] Color-coding works (green for goal met, red for off-track)
- [ ] Progress percentages display correctly
- [ ] Edge cases handled gracefully (no scores, partial data, zero goal)
- [ ] No console errors
- [ ] Backend validation rejects invalid summary types

## Known Limitations

- Summary calculations are based on the organization's time period preference
- Changing summary type does not recalculate historical summaries (only affects current display)
- Percentage calculation assumes goal > 0

## Rollback Plan

If issues are discovered:
1. Revert frontend changes (3 commits)
2. Revert backend changes (1 commit)
3. Database column remains but is not used (safe to leave)
