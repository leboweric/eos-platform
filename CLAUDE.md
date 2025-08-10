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

### Important Trademark Compliance Changes
Due to trademark compliance, several tables were renamed:
- **vtos** → **business_blueprints** (Vision/Traction Organizer)
- **rocks** → **quarterly_priorities**
- **eosi_organizations** → **consultant_organizations**
- Core values are stored in `core_values` table with foreign key `vto_id` referencing `business_blueprints`

### Important URLs
- Production: https://axp.com
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

## CRITICAL: Creating New Organizations via SQL

### ⚠️ NEVER use the special UUID for Leadership Teams!

When creating organizations via SQL:
```sql
-- ✅ CORRECT: Use gen_random_uuid() for Leadership Team
INSERT INTO teams (id, name, organization_id, is_leadership_team)
VALUES (gen_random_uuid(), 'Leadership Team', <org_id>, true);

-- ❌ WRONG: Never use the special UUID
-- VALUES ('00000000-0000-0000-0000-000000000000', ...) -- NO!
```

**Why this matters:**
- Only ONE organization can own the special UUID at a time
- Using it will steal the UUID from another org, breaking their system
- Each org MUST have its own unique Leadership Team ID
- The `is_leadership_team = true` flag is what makes the UI work, not the UUID

**See `SPECIAL_UUID_MIGRATION_GUIDE.md` for full details if an org is broken.**

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

## Creating New Organizations via SQL

### Database Schema Reference
When creating organizations via SQL, use these table structures:

#### Organizations Table
- `id`: UUID
- `name`: Organization name
- `slug`: URL-safe unique identifier (lowercase, hyphens)
- `subscription_tier`: 'free', 'professional', or 'enterprise'
- `created_at`, `updated_at`: Timestamps

#### Teams Table  
- `id`: UUID
- `organization_id`: References organizations(id)
- `name`: Team/Department name
- `created_at`, `updated_at`: Timestamps
- **Note**: Leadership Team must use UUID '00000000-0000-0000-0000-000000000000'

#### Users Table
- `id`: UUID
- `email`: Unique email address
- `password_hash`: Encrypted password
- `first_name`, `last_name`: User names
- `role`: 'admin' or 'member'
- `organization_id`: References organizations(id)
- `created_at`, `updated_at`: Timestamps

#### Team Members Table
- Links users to teams
- `user_id`: References users(id)
- `team_id`: References teams(id)
- `role`: Usually 'member'
- `joined_at`: Timestamp

### Creating a New Organization
Use the template in `/migrate_boyum_simple.sql` as a reference. Key steps:

1. Generate organization with unique slug
2. Create Leadership Team with special UUID ('00000000-0000-0000-0000-000000000000')
3. Create additional teams/departments
4. Create users with hashed password ($2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq = 'Abc123!@#')
5. Link users to teams via team_members table

### Important Notes
- Business Blueprint data (formerly VTO) is stored in `business_blueprints` table with related data in `core_values`, `core_focus`, etc.
- The `core_values` table still uses `vto_id` as the foreign key column name (referencing `business_blueprints.id`)
- No subscription or billing tables needed for basic setup
- Users don't have direct team_id - they're linked through team_members table
- Due to trademark compliance: VTO → Business Blueprint, Rocks → Quarterly Priorities

### CRITICAL: Business Blueprint Setup Requirements
**IMPORTANT**: The business blueprint MUST have `team_id = NULL` for organization-level blueprints!
- The API looks for blueprints with `team_id IS NULL` (not Leadership Team UUID)
- Even though Leadership Team uses UUID '00000000-0000-0000-0000-000000000000', the blueprint should have NULL
- The backend auto-creates an empty blueprint if it doesn't find one with NULL team_id
- Always check for and remove duplicate blueprints after creation

## SMART Rock Assistant Feature (August 2025)

### Overview
AI-powered assistant to help create SMART (Specific, Measurable, Achievable, Relevant, Time-bound) Rocks/Priorities. This is a completely separate, additive feature that doesn't modify existing Rock functionality.

### Architecture
- **OpenAI Integration**: Uses GPT-4 for Rock analysis and suggestions
- **New Database Table**: `rock_suggestions` stores AI-generated improvements
- **Separate UI**: New SmartRockAssistant page accessible via menu
- **Optional Enhancement**: "Get AI Help" button added to existing RockDialog
- **API Namespace**: All AI endpoints under `/api/v1/ai/`

### Implementation Status
- **Phase 1**: Backend OpenAI service setup
- **Phase 2**: SMART analysis and scoring
- **Phase 3**: Frontend assistant page
- **Phase 4**: Advanced features (milestone generation, alignment checking)

### Key Features
1. **SMART Scoring**: Analyzes Rocks against SMART criteria (0-100% score)
2. **Improvement Suggestions**: Specific recommendations for each SMART criterion
3. **Milestone Generation**: AI-generated milestones based on Rock duration
4. **Alignment Checking**: Ensures Department Rocks align with Company Rocks
5. **Real-time Assistance**: Suggestions as user types in the wizard

### Database Schema Addition
```sql
CREATE TABLE rock_suggestions (
  id UUID PRIMARY KEY,
  priority_id UUID REFERENCES quarterly_priorities(id),
  suggestion_type VARCHAR(50), -- 'smart_improvement', 'milestone', 'alignment'
  original_text TEXT,
  suggested_text TEXT,
  reasoning TEXT,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

### API Endpoints
- `POST /api/v1/ai/rock-assistant/analyze` - Analyze Rock for SMART criteria
- `POST /api/v1/ai/rock-assistant/suggest-milestones` - Generate milestone suggestions
- `POST /api/v1/ai/rock-assistant/check-alignment` - Check alignment with Company Rocks

### Environment Variables
- `OPENAI_API_KEY` - Required for AI features

### Security
- API key stored in environment variables only
- Rate limiting on AI endpoints
- User authentication required
- Audit trail of suggestions

### Important Notes
- This feature is completely opt-in
- Existing Rock creation/editing remains unchanged
- AI suggestions are stored for learning/improvement
- No modification to existing quarterly_priorities table structure