# AXP - Adaptive Execution Platform - Project Documentation for Claude

## Project Overview
AXP (Adaptive Execution Platform) is the world's first execution platform that adapts to any business methodology. Unlike traditional tools locked to specific frameworks, AXP seamlessly transforms between EOS, 4DX, OKRs, Scaling Up, or custom methodologies while preserving all data. It helps organizations manage their strategic plans, priorities, scorecards, and team execution regardless of their chosen framework.

## Key Architecture Decisions

### Database
- **PostgreSQL** - All data is stored in PostgreSQL, hosted on Railway
- **NO LOCAL FILE STORAGE** - Documents and files are stored as bytea in PostgreSQL, NOT on the filesystem
- Railway deployments have ephemeral filesystems - any local files are lost on redeploy

### Technology Stack
- **Backend**: Node.js with Express (ES6 modules)
- **Frontend**: React with Vite
- **Database**: PostgreSQL
- **Hosting**: Railway (backend), Netlify (frontend)
- **Authentication**: JWT tokens + OAuth 2.0 (Google & Microsoft)
- **Cloud Storage**: Pluggable adapters for Google Drive, OneDrive, SharePoint
- **AI Integration**: OpenAI GPT-4 for SMART goal validation (planned)

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
- Production: https://axplatform.app
- API: https://api.axplatform.app/api/v1 (custom domain pointing to Railway)
- Railway Backend: https://eos-platform-production.up.railway.app/api/v1
- Client Subdomains: https://[client].axplatform.app (e.g., myboyum.axplatform.app)

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

## Cloud Storage Integration (August 2025)

### Overview
Implemented a revolutionary cloud storage integration that allows organizations to store documents in their own Google Drive, OneDrive, or SharePoint instead of our internal database. This provides complete data sovereignty while maintaining seamless integration.

### Architecture
- **Storage Factory Pattern**: `StorageFactory` manages adapter creation and caching
- **Base Adapter Class**: `StorageAdapter` defines the interface all providers must implement
- **Provider Adapters**:
  - `GoogleDriveAdapter`: Google Drive integration via service account
  - `OneDriveAdapter`: Microsoft OneDrive/SharePoint via app-only auth
  - `InternalStorageAdapter`: PostgreSQL bytea storage (default)

### Key Features
1. **Seamless Provider Switching**: Organizations can change storage providers without data loss
2. **Hierarchical Folder Structure**: Auto-creates year/quarter/department folders
3. **Permission Sync**: Maps AXP visibility (company/department/private) to cloud permissions
4. **Admin Configuration UI**: Complete setup wizard with embedded guides
5. **Test Connection**: Validates configuration before saving

### Configuration Requirements

#### Google Drive
- Service Account with domain-wide delegation
- Google Workspace Admin approval
- Drive API enabled
- Root folder ID

#### OneDrive/SharePoint  
- Azure AD App Registration
- Application permissions (Files.ReadWrite.All)
- Admin consent granted
- Tenant ID, Client ID, Client Secret

### Database Schema
```sql
ALTER TABLE organizations ADD COLUMN default_storage_provider VARCHAR(50) DEFAULT 'internal';
ALTER TABLE organizations ADD COLUMN storage_config JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN storage_provider VARCHAR(50);
ALTER TABLE documents ADD COLUMN external_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN external_url TEXT;
```

### Important Implementation Notes
- Use `import { query as dbQuery }` to avoid naming conflicts
- All storage operations are async and return standardized responses
- Errors are logged to `cloud_storage_sync_log` table
- Provider config is encrypted in database

## OAuth Authentication (August 2025)

### Overview
Implemented OAuth 2.0 authentication for Google and Microsoft accounts, allowing users to sign in without passwords. This is especially important for enterprise customers like Boyum who use Microsoft 365.

### Implementation Details

#### Frontend Components
- **Login/Register Pages**: Added "Continue with Google" and "Continue with Microsoft" buttons
- **OAuth Service** (`/frontend/src/services/oauthService.js`): Handles OAuth redirects and callbacks
- **OAuth Callback Page** (`/frontend/src/pages/OAuthCallback.jsx`): Processes OAuth success/failure
- **Subdomain Routing**: Client-specific subdomains (e.g., myboyum.axplatform.app) redirect directly to login

#### Backend Implementation
- **Google OAuth Controller** (`/backend/src/controllers/oauthController.js`):
  - Uses `google-auth-library` package
  - Exchanges authorization codes for tokens
  - Creates/links user accounts based on email
  
- **Microsoft OAuth Controller** (`/backend/src/controllers/microsoftOAuthController.js`):
  - Uses `@azure/msal-node` package  
  - Multi-tenant configuration for any Microsoft account
  - Special handling for myboyum.com domain users

#### Database Schema
Added OAuth fields to users table (migration 049_add_oauth_fields.sql):
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

#### OAuth Flow
1. User clicks OAuth button → Frontend requests auth URL from backend
2. Backend generates OAuth URL with proper scopes and redirect URI
3. User authenticates with provider → Provider redirects to callback URL
4. Backend exchanges code for tokens and user info
5. Creates/updates user account and generates JWT
6. Redirects to frontend with token

### Configuration

#### Environment Variables Required
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.axplatform.app/api/v1/auth/google/callback

# Microsoft OAuth  
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_CALLBACK_URL=https://api.axplatform.app/api/v1/auth/microsoft/callback
```

#### Google Cloud Console Setup
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URI: `https://api.axplatform.app/api/v1/auth/google/callback`
3. Enable Google+ API

#### Microsoft Azure Setup
1. Register app in Azure Portal
2. Set as multi-tenant (Accounts in any organizational directory)
3. Add redirect URI: `https://api.axplatform.app/api/v1/auth/microsoft/callback`
4. Create client secret

### Custom Domain Configuration
- Created `api.axplatform.app` subdomain pointing to Railway backend
- Required because Google OAuth doesn't accept Railway URLs for production
- DNS CNAME record: `api.axplatform.app` → Railway deployment URL

### Important Implementation Notes

#### ES6 Module Syntax
Backend uses ES6 modules (`"type": "module"` in package.json):
```javascript
// ✅ Correct
import express from 'express';

// ❌ Wrong - will cause deployment failure
const express = require('express');
```

#### Organization Assignment
- OAuth users are automatically assigned to first available organization
- myboyum.com emails are specifically assigned to Boyum organization
- New users without orgs are redirected to registration

#### Account Linking
- Existing users can link OAuth accounts
- Email address is used as the unique identifier
- Multiple OAuth providers can be linked to same account

### Testing OAuth Endpoints
```bash
# Check Google OAuth
curl https://api.axplatform.app/api/v1/auth/google

# Check Microsoft OAuth  
curl https://api.axplatform.app/api/v1/auth/microsoft
```

### Common Issues and Solutions

1. **Invalid Grant Error in Logs**
   - Normal when testing with invalid codes
   - Production users with valid codes won't see this

2. **Redirect URI Mismatch**
   - Ensure callback URLs match exactly in provider console
   - Include `/api/v1` in the path

3. **CORS Issues**
   - Frontend uses proxy configuration for local development
   - Production uses proper domain configuration

## Recent Updates (August 2025)

### Todo and Issue Linking Improvements
- **Fixed**: Field name mismatch between frontend and backend for todo creation
  - Backend expected `assignedToId` but frontend sent `assigned_to_id`
- **Added**: Click-to-open functionality for todos (like issues already had)
- **Removed**: Three-dots dropdown menu from todos as redundant
- **Removed**: Complex automatic issue creation logic for overdue todos (181 lines removed)
- **Improved**: Error messaging for duplicate linked issues (409 conflict handling)
- **UI Changes**: 
  - Removed "Already in Issues List" text from overdue todos
  - Fixed todo list disappearing when creating linked issues
  - Added explicit error message when issue already exists for a todo

### UI/UX Improvements
- **Logo Size**: Increased from h-20 to h-28 on login/register pages
- **Branding**: Removed "Accountability & Execution Platform" tagline
- **Subdomain Routing**: Client subdomains (e.g., myboyum.axplatform.app) now redirect directly to login

## Adaptive Framework Technology™ (August 2025)

### Overview
AXP is the world's first Adaptive Execution Platform that can seamlessly switch between different business methodologies (EOS, 4DX, Scaling Up, custom) while preserving all data.

### Terminology System
- **Dynamic Terminology Mapping**: All UI labels adapt based on selected framework
- **Data Preservation**: Switching frameworks doesn't lose data, just remaps terminology
- **Framework Presets**:
  - EOS: Rocks, V/TO, Level 10, IDS
  - 4DX: WIGs, Lead Measures, WIG Sessions
  - Custom: Fully configurable terminology

### Implementation
- `useTerminology` hook provides framework-specific terms
- Organization-level setting: `terminology_set` field
- Real-time UI updates without page refresh
- Affects: navigation, headers, buttons, email templates

### Business Impact
- Organizations aren't locked into one methodology
- Consultants can serve clients using different frameworks
- Smooth transitions when companies evolve their approach

## Meeting Improvements (August 2025)

### Todo-Issue Bidirectional Linking
- Create linked todo from issue (was broken, now fixed)
- Create linked issue from todo (new feature)
- Visual indicators show linkage
- Prevents duplicate creation with clear error messages

### UI/UX Enhancements
- Click anywhere on todo card to edit (removed redundant three-dots menu)
- Removed automatic issue creation from overdue todos (too complex)
- Larger logo on login/register pages (h-28 instead of h-20)
- Removed "Accountability & Execution Platform" tagline

### Bug Fixes
- Fixed field naming mismatch (assignedToId vs assigned_to_id)
- Fixed todo list disappearing after creating linked issue
- Fixed 409 conflict errors with better error messaging
- Fixed ES6 module imports for production deployment

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

### Collaborative Meeting Mode (December 2024)
- **Implemented**: Real-time collaborative meeting features with WebSocket/Socket.io
- **Backend**: Created `meetingSocketService.js` for handling real-time meeting events
- **Frontend**: Added `useMeeting` hook and `MeetingBar` component for meeting UI
- **Features**:
  - Real-time presence indicators showing who's in the meeting
  - Navigation following - participants can follow the meeting leader
  - Individual participant ratings - each person rates the meeting independently
  - "Meeting in Progress" visual indicators on meeting cards
  - Join active meetings with participant count display
- **Configuration**: Controlled via `ENABLE_MEETINGS=true` environment variable (feature flag)
- **Key Design Decision**: Uses team ID as meeting identifier (no codes needed)
- **Important**: Only available on Weekly Accountability and Quarterly Planning meeting pages

### Individual Meeting Ratings
- **Problem**: Original implementation only had single meeting rating
- **Solution**: Each participant can now rate the meeting independently
- **UI Changes**:
  - Shows input only for current user (marked with "You")
  - Other participants' ratings shown as "Waiting..." until submitted
  - Automatic average calculation displayed
  - Fallback to single rating when not in collaborative meeting
- **Backend**: Accepts `individualRatings` object in conclude meeting endpoint

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

## UI/UX Design System (January 2025)

### Design Philosophy
The platform uses a **premium, modern SaaS aesthetic** that adapts to each organization's custom theme colors while maintaining a consistent, sophisticated feel.

### Core Design Elements

#### Color System
- **Background**: Gradient from `slate-50` via `blue-50/30` to `indigo-50/30`
- **Grid Pattern**: Subtle grid overlay with gradient mask for depth
- **Cards**: `white/80` with `backdrop-blur-sm` for glass-morphism effect
- **Borders**: `border-white/50` for subtle definition
- **Organization Theme**: Custom colors used for accents, gradients, and interactive elements

#### Typography
- **Hero Headings**: `text-4xl` to `text-5xl` with `font-bold`
- **Section Headers**: `text-xl` with `font-semibold`
- **Body Text**: `text-slate-600` to `text-slate-900` for hierarchy
- **Gradient Text**: Used sparingly for emphasis on key headings

#### Component Patterns
- **Cards**: `rounded-2xl` with `shadow-sm` and hover states
- **Buttons**: Gradient backgrounds with `rounded-lg` and scale hover effects
- **Icons**: Placed in colored boxes with gradient backgrounds
- **Progress Bars**: Gradient fills using organization theme colors
- **Badges**: Gradient backgrounds with complementary borders

#### Interactions
- **Hover Effects**: `hover:scale-[1.02]` for subtle lift
- **Transitions**: `transition-all duration-300` for smooth animations
- **Active States**: Scale and shadow changes for feedback
- **Focus States**: Consistent with theme colors

#### Layout Principles
- **Spacing**: Generous padding (`p-6` to `p-8`) for breathing room
- **Grid Gaps**: `gap-6` to `gap-8` for clear separation
- **Max Width**: `max-w-7xl` for optimal reading width
- **Responsive**: Mobile-first with `lg:` breakpoints

### Implementation Examples

#### Standard Card Component
```jsx
<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
  {/* Content */}
</div>
```

#### Theme-Aware Gradient Button
```jsx
<Button 
  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all transform hover:scale-[1.02]"
  style={{
    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
  }}
>
```

#### Icon Badge Pattern
```jsx
<div className="w-10 h-10 rounded-lg flex items-center justify-center"
     style={{
       background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
     }}>
  <IconComponent className="h-5 w-5 text-white" />
</div>
```

### Pages Updated with New Design System
1. **Landing Page** - Complete with gradient hero and feature cards
2. **Login/Register Pages** - Split panels with gradient backgrounds
3. **Dashboard** - Full modernization with all design patterns (January 2025)
4. **Quarterly Priorities** - (In Progress)

### Important Considerations
- **Theme Preservation**: Always respect organization's custom colors
- **Performance**: Use `backdrop-blur-sm` sparingly for performance
- **Accessibility**: Maintain proper contrast ratios with gradient backgrounds
- **Consistency**: Use established patterns across all pages

## Development Guidelines

1. Always use PostgreSQL for data persistence
2. Never rely on local filesystem for storage
3. Test features with Railway deployments in mind
4. Document any new architectural decisions in this file
5. Always run lint and typecheck before committing
6. When creating new routes that are nested under teams, use `router({ mergeParams: true })` to access parent params
7. Follow the UI/UX Design System for all new components and page updates
7. **LANDING PAGE**: Always update the existing `LandingPage.jsx` file. Do NOT create new landing page files (e.g., LandingPageV2, LandingPageNew, etc.). Since we're not live yet, we don't need multiple versions for A/B testing or campaigns. Just modify the existing landing page directly.

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

## Landing Page Positioning (August 2025)

### Blue Ocean Strategy
Completely repositioned AXP as creating a new category rather than competing with existing EOS/4DX tools:
- **Tagline**: "The Execution Platform That Adapts to You"
- **Key Message**: "Not another EOS tool. Not another 4DX app."
- **Category**: "Adaptive Execution Platform"

### Six Game-Changing Features Highlighted
1. **Adaptive Framework Technology™** - Industry first
2. **Real-Time Collaborative Meetings** - Game changer
3. **Your Cloud, Your Control** - Unique
4. **Enterprise OAuth & SSO** - Enterprise ready
5. **AI Strategic Assistant** - AI powered
6. **White-Label Ready** - Your brand

### Marketing Messages
- "Features That Don't Exist Anywhere Else"
- "Stop Adapting to Software. Start Using Software That Adapts."
- "One Platform. Every Methodology."
- Visual framework switching demonstration
- Enterprise testimonials (Boyum Barenscheer featured)

## Freemium Model Concept (August 2025 - Planning)

### Concept
Free tier supported by contextual advertising from consultants and framework providers.

### Contextual Ad Targeting
- **EOS Users**: See EOS Implementers, training, materials
- **4DX Users**: See Franklin Covey consultants, coaches
- **Custom Users**: General business consultants, tools

### Ad Placement Ideas
- Dashboard sidebar (consultant profiles)
- Meeting summary emails ("Powered by [Consultant]")
- Empty states ("Learn how to set effective Rocks")
- After meeting ratings ("Get professional facilitation")

### Benefits
- **Organizations**: Free platform access
- **Consultants**: Qualified leads in their methodology
- **AXP**: Massive adoption, ad revenue, upsell path

### Privacy-First Approach
- No behavioral tracking
- Contextual only (based on framework choice)
- Clear "Sponsored" labels
- Easy upgrade to ad-free

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

## Netlify Build Performance & Memory Issues (August 2025)

### Problem: Build Hanging/Timeout Issues
**Symptoms**: Netlify builds taking 7+ minutes or hanging indefinitely, especially after adding UI modernization changes

### Root Cause Analysis
1. **Memory Exhaustion**: 429MB node_modules + heavy dependencies (xlsx 285KB, recharts, framer-motion)
2. **Concurrent Processing**: Too many parallel operations during build
3. **Large Bundle Size**: 2.3MB+ JavaScript bundle overwhelming build containers
4. **Default Memory Limit**: Netlify's 1GB default insufficient for large React apps

### Solution: Multi-layered Build Optimization

#### 1. Netlify Configuration (`netlify.toml`)
```toml
[build.environment]
  NODE_VERSION = "18"
  NODE_OPTIONS = "--max-old-space-size=4096"  # Increase from 1GB to 4GB
```

#### 2. Vite Build Optimization (`vite.config.js`)
```js
build: {
  target: 'es2020',           // Better compatibility
  minify: 'esbuild',          // Faster than Terser
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'chart-vendor': ['recharts'],
        'excel-vendor': ['xlsx'],  // Isolate heaviest dependency
        'utils-vendor': ['axios', 'date-fns', 'framer-motion']
      }
    },
    maxParallelFileOps: 2       // Reduce concurrent operations
  },
  chunkSizeWarningLimit: 1000
}
```

#### 3. React Lazy Loading (`App.jsx`)
```js
// Convert static imports to lazy loading
const Dashboard = lazy(() => import('./pages/DashboardClean'));
const TodosPage = lazy(() => import('./pages/TodosPage'));
// ... etc for all non-critical pages

// Wrap routes in Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    {/* routes */}
  </Routes>
</Suspense>
```

### Performance Results
- **Build Time**: 7+ minutes → ~2-3 minutes (60%+ improvement)
- **Bundle Size**: 2,397KB → 470KB main bundle (80% reduction)
- **Memory Usage**: No more out-of-memory errors
- **Chunk Distribution**: 5 vendor chunks + lazy-loaded pages

### Key Learnings
1. **Memory is Critical**: Large React apps need more than Netlify's 1GB default
2. **Bundle Splitting**: Code splitting dramatically improves build performance
3. **Dependency Isolation**: Heavy libraries like xlsx should be in separate chunks
4. **Concurrent Operations**: Limiting parallelism prevents memory spikes
5. **Minifier Choice**: esbuild is significantly faster than Terser for large codebases

### Monitoring Build Health
- Watch for bundle size warnings (>500KB chunks)
- Monitor Netlify build logs for memory warnings
- Check for import cycle warnings that can cause bundle bloat
- Verify lazy loading is working (check Network tab)

### Future Optimization Opportunities
1. **Dynamic Imports**: Convert more static imports to dynamic where appropriate
2. **Tree Shaking**: Ensure unused code is properly eliminated
3. **Asset Optimization**: Optimize images and fonts
4. **Service Worker**: Implement for better caching
5. **Bundle Analysis**: Regular bundle size audits with tools like webpack-bundle-analyzer