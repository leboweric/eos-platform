# CLAUDE_ARCHIVE.md - Historical Issues and Resolved Problems

This file contains historical issues, resolved problems, and past updates that are no longer actively relevant but may be useful for reference.

## Table of Contents
- [Resolved Issues](#resolved-issues)
- [Historical Updates](#historical-updates)
- [Past Migrations](#past-migrations)
- [Deprecated Features](#deprecated-features)

---

## Resolved Issues

### Component Naming Confusion (RESOLVED - August 2025)
- **Problem**: Components with "Clean" suffix were mistakenly thought to be duplicates/test versions and deleted during cleanup
- **Root Cause**: Counter-intuitive naming where "Clean" suffix indicates the PRODUCTION version
- **Impact**: Caused Priority Cards and other components to lose formatting and functionality
- **Solution**: Restored exact working state from commit 4e0100a and documented naming convention
- **Prevention**: Always check App.jsx imports before assuming which component version is in use

### Document Download 404 Error (RESOLVED)
- **Problem**: Documents were being stored on local filesystem which is lost on Railway redeploy
- **Solution**: Store document content in PostgreSQL bytea column instead of filesystem

### Railway Deployment Sync (RESOLVED)
- **Problem**: Railway was deploying phantom commits that didn't exist in GitHub
- **Solution**: Manually synced by pushing a test commit
- **Prevention**: Always verify Railway is deploying the correct commit hash

### Data Source Field Issue (RESOLVED)
- **Problem**: Conditional rendering issue - field wasn't saving properly in Edit Metric dialog
- **Solution**: Fixed conditional rendering logic

### Email Service Call Syntax (RESOLVED)
- **Problem**: sendEmail function was being called with object syntax
- **Solution**: Must use `sendEmail(to, templateName, data)` not object syntax

### Current Month Detection (RESOLVED)
- **Problem**: Scorecard views showing incorrect month
- **Solution**: Fixed to show current month correctly

### Team Member Queries (RESOLVED)
- **Problem**: Queries referencing non-existent users.team_id column
- **Solution**: Updated to use team_members table

---

## Historical Updates

### Todo and Issue Linking Improvements (August 2025)
- Fixed field name mismatch between frontend and backend for todo creation
  - Backend expected `assignedToId` but frontend sent `assigned_to_id`
- Added click-to-open functionality for todos
- Removed three-dots dropdown menu from todos as redundant
- Removed complex automatic issue creation logic for overdue todos (181 lines removed)
- Improved error messaging for duplicate linked issues (409 conflict handling)
- UI Changes: 
  - Removed "Already in Issues List" text from overdue todos
  - Fixed todo list disappearing when creating linked issues
  - Added explicit error message when issue already exists for a todo

### UI/UX Improvements (August 2025)
- Logo Size: Increased from h-20 to h-28 on login/register pages
- Branding: Removed "Accountability & Execution Platform" tagline
- Subdomain Routing: Client subdomains redirect directly to login

### Meeting Email Summaries (July 2025)
- Implemented email summaries when concluding Weekly Accountability Meetings
- Backend: Added `meetingsController.js` and conclude endpoint
- Frontend: Created `meetingsService.js` 
- Email Template: Added `meetingSummary` template
- Key Fix: Use `router({ mergeParams: true })` to access parent params
- Recipients: Only sends to team members

### Collaborative Meeting Mode (December 2024)
- Real-time collaborative meeting features with WebSocket/Socket.io
- Backend: Created `meetingSocketService.js` for real-time events
- Frontend: Added `useMeeting` hook and `MeetingBar` component
- Features:
  - Real-time presence indicators
  - Navigation following
  - Individual participant ratings
  - "Meeting in Progress" visual indicators
  - Join active meetings with participant count display
- Configuration: Controlled via `ENABLE_MEETINGS=true` environment variable

### Individual Meeting Ratings
- Problem: Original implementation only had single meeting rating
- Solution: Each participant can rate the meeting independently
- UI shows input only for current user
- Other participants' ratings shown as "Waiting..."
- Automatic average calculation displayed

---

## Past Migrations

### Importing Scorecard Data from Ninety.io (December 2024)

#### Database Schema Limitations
- Original scorecard tables used `DECIMAL(10, 2)` which only supports values up to 99,999,999.99
- Large financial metrics like AUM exceed this limit
- Solution: Alter columns to `DECIMAL(20, 2)`:
```sql
ALTER TABLE scorecard_metrics ALTER COLUMN goal TYPE DECIMAL(20, 2);
ALTER TABLE scorecard_scores ALTER COLUMN value TYPE DECIMAL(20, 2);
```

#### Multi-Tenancy Considerations
- Each organization can have its own metrics with the same names
- Use `organization_id`, `team_id`, and `name` combination to identify unique metrics
- Never create global unique constraints that would prevent multiple orgs from having "Revenue" metrics

#### PL/pgSQL Variable Naming
- Variable names can conflict with column names causing "ambiguous reference" errors
- Solution: Prefix variables with `v_` (e.g., `v_metric_id` instead of `metric_id`)

#### Files Created for Import
1. `fix_scorecard_decimal_precision.sql` - Schema migration to support large values
2. `import_boyum_scorecard_final.sql` - Main import script with all metrics and scores

---

## Deprecated Features

### Document Categories
- `category` field in documents table is DEPRECATED
- Documents are now organized by folders using `folder_id`

### File Path Storage
- `file_path` column in documents table is DEPRECATED
- Use `file_data` bytea column for storing actual file data

### Direct Team Assignment
- Users don't have direct team_id
- They're linked through team_members table

---

## End of Archive

For current, active documentation, see `CLAUDE.md`