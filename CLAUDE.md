# EOS Platform - Project Documentation for Claude

## Project Overview
EOS Platform is a web application for implementing the Entrepreneurial Operating System (EOS) methodology. It helps organizations manage their Vision/Traction Organizer (VTO), priorities, issues, and team accountability.

## Key Architecture Decisions

### Database
- **PostgreSQL** - All data is stored in PostgreSQL, hosted on Railway
- **NO LOCAL FILE STORAGE** - Documents and files are stored as bytea in PostgreSQL, NOT on the filesystem
- Railway deployments have ephemeral filesystems - any local files are lost on redeploy

### Technology Stack
- **Backend**: Node.js with Express
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **Hosting**: Railway (both frontend and backend)
- **Authentication**: JWT tokens

### Document Storage
- Documents are stored in the `documents` table
- File content should be stored in a `file_content` bytea column in PostgreSQL
- The `file_path` column is deprecated and should not be used
- This ensures documents persist across deployments

### Important URLs
- Production: https://42vibes.com
- API: https://eos-platform-production.up.railway.app/api/v1

### Common Commands
- Lint: `npm run lint`
- Type check: `npm run typecheck` (if available)

## Recent Updates (July 2025)

### Scorecard Groups Feature
- **Implemented**: Drag-and-drop grouping for scorecard metrics
- **Database**: Added `scorecard_groups` table and `group_id` to `scorecard_metrics`
- **Migration**: Run migration 038_add_scorecard_groups.sql
- **Components**: Created `GroupedScorecardView.jsx` with collapsible groups
- **Features**:
  - Separate groups for weekly and monthly views
  - Drag metrics between groups
  - Reorder groups via drag and drop
  - Color-coded group headers
  - Persist expand/collapse state

### Meeting Email Summaries
- **Implemented**: Email summaries when concluding Weekly Accountability Meetings
- **Backend**: Added `meetingsController.js` and `/api/v1/organizations/:orgId/teams/:teamId/meetings/conclude` endpoint
- **Frontend**: Created `meetingsService.js` 
- **Email Template**: Added `meetingSummary` template in emailService.js
- **Key Fix**: Use `router({ mergeParams: true })` in meetings.js to access parent route params
- **Recipients**: Only sends to team members (uses team_members table)

### Important Fixes Applied
1. **Data Source Field**: Fixed conditional rendering issue - now saves properly in Edit Metric dialog
2. **Email Service**: Fixed sendEmail function call - must use `sendEmail(to, templateName, data)` not object syntax
3. **Current Month Detection**: Fixed to show July 2025 correctly in scorecard views
4. **Team Member Queries**: Updated to use team_members table instead of non-existent users.team_id column

## Current Issues and Solutions

### Document Download 404 Error
- **Problem**: Documents were being stored on local filesystem which is lost on Railway redeploy
- **Solution**: Store document content in PostgreSQL bytea column instead of filesystem

### Railway Deployment Sync
- **Problem**: Railway was deploying phantom commits that didn't exist in GitHub
- **Solution**: Manually synced by pushing a test commit
- **Prevention**: Always verify Railway is deploying the correct commit hash

## Database Schema Notes

### Documents Table
- `id`: UUID primary key
- `title`: Document title
- `description`: Optional description
- `category`: DEPRECATED - No longer used, documents are organized by folders
- `file_name`: Original filename
- `file_path`: DEPRECATED - do not use
- `file_data`: bytea column for storing actual file data
- `file_size`: Size in bytes
- `mime_type`: MIME type of file
- `visibility`: company, department, or private
- `organization_id`: Foreign key to organizations
- `department_id`: Optional foreign key to teams
- `uploaded_by`: Foreign key to users
- `related_priority_id`: Optional foreign key to priorities
- `folder_id`: Foreign key to document_folders (how documents are organized)

### Document Folders Table
- `id`: UUID primary key
- `name`: Folder name
- `parent_folder_id`: Self-referencing foreign key for nested folders
- `organization_id`: Foreign key to organizations
- `created_by`: Foreign key to users
- `visibility`: Folder visibility level (company, department, personal)
- `department_id`: Foreign key to teams (required when visibility = 'department')
- `owner_id`: Foreign key to users (required when visibility = 'personal')

### Folder Permissions
- **Company folders**: Only admins can create/update/delete
- **Department folders**: Only admins can create/update/delete
- **Personal folders**: Users can create/update/delete their own folders
- All users can view folders they have access to based on visibility

## Development Guidelines

1. Always use PostgreSQL for data persistence
2. Never rely on local filesystem for storage
3. Test features with Railway deployments in mind
4. Document any new architectural decisions in this file
5. Always run lint and typecheck before committing
6. When creating new routes that are nested under teams, use `router({ mergeParams: true })` to access parent params

## Database Tables Reference

### Scorecard Groups (New)
- `scorecard_groups`: Stores metric groupings with team-based organization
- Key columns: `team_id`, `name`, `display_order`, `color`, `is_expanded`
- Linked to scorecard_metrics via `group_id` foreign key

### Team Members
- `team_members`: Maps users to teams/departments
- Used for determining email recipients and access control
- Leadership team has special ID: '00000000-0000-0000-0000-000000000000'

## API Endpoints Reference

### Meetings
- `POST /api/v1/organizations/:orgId/teams/:teamId/meetings/conclude`
  - Concludes meeting and sends email summary to team members
  - Requires: meetingType, duration, rating, and optional summary data

### Scorecard Groups
- `GET/POST /api/v1/organizations/:orgId/teams/:teamId/scorecard/groups`
- `PUT /api/v1/organizations/:orgId/teams/:teamId/scorecard/groups/:groupId`
- `DELETE /api/v1/organizations/:orgId/teams/:teamId/scorecard/groups/:groupId`
- `PUT /api/v1/organizations/:orgId/teams/:teamId/scorecard/metrics/:metricId/move-to-group`
- `PUT /api/v1/organizations/:orgId/teams/:teamId/scorecard/groups/reorder`