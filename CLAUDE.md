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

## CRITICAL: Component Naming Convention

### ⚠️ "Clean" Components are PRODUCTION Components

**IMPORTANT**: Components with "Clean" suffix are the CURRENT PRODUCTION components in active use:

- `PriorityCardClean.jsx` - **PRODUCTION** Priority Card component (fully featured with milestone editing)
- `QuarterlyPrioritiesPageClean.jsx` - **PRODUCTION** Quarterly Priorities page
- `DashboardClean.jsx` - **PRODUCTION** Dashboard
- `ScorecardPageClean.jsx` - **PRODUCTION** Scorecard page
- `IssuesPageClean.jsx` - **PRODUCTION** Issues page
- `TodosListClean.jsx` - **PRODUCTION** Todos list component

### Component Import Rules

**App.jsx imports the PRODUCTION "Clean" versions:**
```javascript
import Dashboard from './pages/DashboardClean';
import QuarterlyPrioritiesPage from './pages/QuarterlyPrioritiesPageClean';
import ScorecardPage from './pages/ScorecardPageClean';
import IssuesPage from './pages/IssuesPageClean';
```

**Other components import Clean versions:**
```javascript
import PriorityCard from '../components/priorities/PriorityCardClean';
import TodosList from '../components/todos/TodosListClean';
import ScorecardTable from '../components/scorecard/ScorecardTableClean';
import IssuesList from '../components/issues/IssuesListClean';
```

### ❌ DO NOT DELETE "Clean" Components
- "Clean" components are NOT duplicates or test versions
- They are the ACTIVE PRODUCTION components with full functionality
- Non-Clean versions (if they exist) are often older/incomplete versions
- Always verify imports in App.jsx to understand which version is actually in use

### Before Making Changes
1. **Check App.jsx imports** to see which version is actually being used
2. **Search for component usage** across the codebase before deleting anything
3. **Test builds** after any component changes
4. **Never assume** component naming indicates test/production status

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

### Component Naming Confusion (RESOLVED - August 2025)
- **Problem**: Components with "Clean" suffix were mistakenly thought to be duplicates/test versions and deleted during cleanup
- **Root Cause**: Counter-intuitive naming where "Clean" suffix indicates the PRODUCTION version
- **Impact**: Caused Priority Cards and other components to lose formatting and functionality
- **Solution**: Restored exact working state from commit 4e0100a and documented naming convention above
- **Prevention**: Always check App.jsx imports before assuming which component version is in use

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

### Scorecard Tables
#### scorecard_metrics
- `id`: UUID primary key
- `organization_id`: Foreign key to organizations
- `team_id`: Foreign key to teams
- `name`: Metric name (must be unique per org/team combination)
- `goal`: DECIMAL(20, 2) - supports values up to 999,999,999,999,999,999.99
- `type`: 'weekly', 'monthly', or 'quarterly'
- `value_type`: 'number', 'currency', or 'percentage'
- `comparison_operator`: 'greater_equal', 'less_equal', or 'equal'
- `owner`: Optional VARCHAR(255) for metric owner name
- `description`: Optional TEXT for additional context

#### scorecard_scores
- `id`: UUID primary key
- `metric_id`: Foreign key to scorecard_metrics
- `week_date`: DATE for the score date
- `value`: DECIMAL(20, 2) - supports large financial values
- UNIQUE constraint on (metric_id, week_date)

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

## Scorecard Configuration

### CRITICAL: Scorecard Metrics Requirements
**IMPORTANT**: Scorecard metrics MUST have the `owner` field populated to display in the UI!

#### Known Issues and Solutions
1. **Metrics not displaying despite being in database**
   - **Cause**: The `owner` column is NULL
   - **Solution**: Update metrics to have an owner value (can be a team name or person name)
   - **Example fix**:
   ```sql
   UPDATE scorecard_metrics
   SET owner = 'Team Name'
   WHERE team_id = 'your-team-id'
     AND owner IS NULL;
   ```

#### Scorecard Metrics Table Structure
- `id`: UUID
- `organization_id`: References organizations(id)
- `team_id`: References teams(id)
- `name`: Metric name
- `goal`: Target value (numeric)
- `owner`: **REQUIRED** - Must not be NULL for metrics to display
- `type`: 'weekly' or 'monthly'
- `value_type`: 'number', 'percentage', 'currency'
- `comparison_operator`: 'greater_equal', 'less_equal', or 'equal'
- `display_order`: Sort order for display

#### Valid Comparison Operators
Only three operators are supported:
- `greater_equal` (≥) - Use for "greater than or equal to" goals
- `less_equal` (≤) - Use for "less than or equal to" goals  
- `equal` (=) - Use for exact match goals
**Note**: `greater` and `less` are NOT valid and will cause constraint violations

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

## Importing Scorecard Data from Ninety.io (December 2024)

### Overview
Process for migrating monthly scorecard data from Ninety.io to the EOS Platform. This was implemented for Boyum Barenscheer organization.

### Key Learnings

#### 1. Database Schema Limitations
- **Problem**: Original scorecard tables used `DECIMAL(10, 2)` which only supports values up to 99,999,999.99
- **Issue**: Large financial metrics like Assets Under Management (AUM) exceed this limit (e.g., $150,000,000)
- **Solution**: Alter columns to `DECIMAL(20, 2)` to support values up to 999,999,999,999,999,999.99
```sql
ALTER TABLE scorecard_metrics ALTER COLUMN goal TYPE DECIMAL(20, 2);
ALTER TABLE scorecard_scores ALTER COLUMN value TYPE DECIMAL(20, 2);
```

#### 2. Multi-Tenancy Considerations
- **Important**: Each organization can have its own metrics with the same names
- **Key**: Use `organization_id`, `team_id`, and `name` combination to identify unique metrics
- **Never**: Create global unique constraints that would prevent multiple orgs from having "Revenue" metrics

#### 3. PL/pgSQL Variable Naming
- **Problem**: Variable names can conflict with column names causing "ambiguous reference" errors
- **Solution**: Prefix variables with `v_` (e.g., `v_metric_id` instead of `metric_id`)
- **Alternative**: Qualify column names with table names (e.g., `scorecard_scores.metric_id`)

#### 4. Data Import Pattern
```sql
-- Check if metric exists for this org/team
SELECT id INTO v_metric_id 
FROM scorecard_metrics 
WHERE organization_id = org_id 
  AND team_id = leadership_team_id 
  AND name = 'Metric Name';

IF v_metric_id IS NULL THEN
    -- Insert new metric
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator)
    VALUES (org_id, leadership_team_id, 'Metric Name', goal_value, 'monthly', 'currency', 'greater_equal')
    RETURNING id INTO v_metric_id;
ELSE
    -- Update existing metric
    UPDATE scorecard_metrics 
    SET goal = goal_value, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal'
    WHERE id = v_metric_id;
END IF;

-- Clear old scores and insert new ones
DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;

INSERT INTO scorecard_scores (metric_id, week_date, value) VALUES
(v_metric_id, '2024-08-01', 123456.78),
(v_metric_id, '2024-09-01', 234567.89);
```

#### 5. Metric Configuration
- **value_type**: Set to 'number', 'currency', or 'percentage' based on metric type
- **comparison_operator**: Usually 'greater_equal' for goals (represents ≥)
- **type**: Set to 'monthly' for monthly scorecards
- **goal**: Numeric value (89 for 89% in percentage metrics)

#### 6. Date Handling
- Monthly metrics use first day of month (e.g., '2024-08-01' for August 2024)
- Handle blank cells by simply not inserting records for those dates
- Frontend will display blanks where no score records exist

### Files Created for Import
1. **`fix_scorecard_decimal_precision.sql`** - Schema migration to support large values
2. **`import_boyum_scorecard_final.sql`** - Main import script with all metrics and scores

### Common Pitfalls to Avoid
1. Don't assume owner data - only import what you have
2. Don't create global unique constraints that break multi-tenancy
3. Don't forget to handle NULL/blank data appropriately
4. Always check existing data before inserting to avoid duplicates
5. Remember that DECIMAL precision limits can cause silent failures