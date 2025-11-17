# TODO: Scorecard Variable Summary Attribute

This document tracks the implementation of variable summary attributes for scorecard metrics.

## Phase 1: Database & Backend (Foundation)

- [ ] **Database Migration**
    - [ ] Create a new migration file.
    - [ ] Add `summary_type` column to `scorecard_metrics` table.
        - Type: `VARCHAR` or `ENUM`
        - Allowed Values: `weekly_avg`, `monthly_avg`, `quarterly_total`, `quarterly_avg`, `latest_value`
        - Default: `weekly_avg`
        - Nullable: `false`
    - [ ] Run the migration.
- [ ] **Update Backend API**
    - [ ] Modify `issuesController.js` -> `updateMetric()` to accept `summary_type`.
    - [ ] Modify `issuesController.js` -> `createMetric()` to accept `summary_type`.
    - [ ] Update SQL queries to include `summary_type` in `SELECT` and `UPDATE` statements.
    - [ ] Add validation for allowed `summary_type` values.
- [ ] **Update Backend Response**
    - [ ] Ensure `getIssues()` returns `summary_type` for each metric.
    - [ ] Test that the field is properly serialized in API responses.

## Phase 2: Frontend - Metric Creation/Edit UI

- [ ] **Update Metric Form (`ScorecardPageClean.jsx`)**
    - [ ] Add a new dropdown/select field: "Summary Display".
    - [ ] Add options: "Weekly Average", "Monthly Average", "Quarterly Total", "Quarterly Average", "Latest Value".
    - [ ] Add helper text explaining each option.
    - [ ] Update `metricForm` state to include `summaryType`.
    - [ ] Update `handleSaveMetric()` to send `summaryType` to the API.
- [ ] **Update Metric Dialog (if separate component)**
    - [ ] Apply the same changes to any metric edit dialogs used elsewhere.

## Phase 3: Frontend - Scorecard Display Logic

- [x] **Update `ScorecardTableClean.jsx` - Summary Column**
    - [x] Modify the summary column calculation logic.
    - [x] Create a helper function: `calculateMetricSummary(metric, scores, summaryType)`.
        - [x] Implement `weekly_avg` calculation.
        - [x] Implement `monthly_avg` calculation.
        - [x] Implement `quarterly_total` calculation.
        - [x] Implement `quarterly_avg` calculation.
        - [x] Implement `latest_value` calculation.
- [x] **Update Summary Column Header**
    - [x] Kept existing header structure (works well with variable summaries).
- [x] **Update Summary Cell Rendering**
    - [x] Display the calculated value.
    - [x] Show progress toward the goal (value, goal, and percentage).
    - [x] Implement color-coding for goal achievement (green/red).

## Phase 4: Frontend - Meeting Pages

- [x] **Update L10 Meeting Pages**
    - [x] Verified 90-minute meeting (`WeeklyAccountabilityMeetingPage.jsx`) uses ScorecardTableClean correctly.
    - [x] Verified 60-minute meeting (`WeeklyAccountabilityExpressMeetingPage.jsx`) uses ScorecardTableClean correctly.
    - [x] Both meetings pass scorecardTimePeriodPreference - summary logic works automatically.

## Phase 5: Data Migration & Defaults

- [x] **Set Default Values for Existing Metrics**
    - [x] Database migration set default `summary_type = 'weekly_avg'` for all existing metrics.
- [ ] **Smart Defaults (Optional Enhancement)**
    - [ ] Auto-suggest `summary_type` based on `value_type` or `type` when creating a new metric (Future enhancement).

## Phase 6: Testing & Validation

- [ ] **Test Cases** (See SCORECARD_VARIABLE_SUMMARY_TESTING.md for detailed instructions)
    - [ ] Create metrics with each `summary_type`.
    - [ ] Verify calculations are correct.
    - [ ] Test in main Scorecard page.
    - [ ] Test in 60-minute meeting.
    - [ ] Test in 90-minute meeting.
    - [ ] Test editing existing metrics.
    - [ ] Test that old metrics still work with default value.
- [ ] **Edge Cases**
    - [ ] Metrics with no scores yet.
    - [ ] Metrics with partial data (e.g., only 2 weeks of a quarter).
    - [ ] Switching `summary_type` after scores exist.

## Phase 7: Documentation & Deployment

- [x] **User Documentation**
    - [x] Added helper text in metric form explaining summary types.
    - [x] Created comprehensive testing documentation (SCORECARD_VARIABLE_SUMMARY_TESTING.md).
- [x] **Deployment**
    - [x] Backend deployed to Railway (commit: b1963094).
    - [x] Frontend deployed to Netlify (commits: 1a71ab2b, 443b1e44).
    - [x] Ready for user testing and validation.
