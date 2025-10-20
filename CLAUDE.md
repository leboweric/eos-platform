# AXP - Adaptive Execution Platform - Essential Documentation for Claude

## Project Overview
AXP (Adaptive Execution Platform) is the world's first execution platform that adapts to any business methodology. Unlike traditional tools locked to specific frameworks, AXP seamlessly transforms between EOS, 4DX, OKRs, Scaling Up, or custom methodologies while preserving all data.

## Critical Architecture Rules

### ⚠️ NO LOCAL FILE STORAGE
- **Documents MUST be stored in PostgreSQL** as bytea, NOT on filesystem
- Railway deployments have persistent filesystems, not ephemeral
- Use `file_content` column, NOT `file_path` for document storage

### ⚠️ Component Naming Convention
**"Clean" Components are PRODUCTION Components!**
- `PriorityCardClean.jsx` - PRODUCTION Priority Card (with milestone editing)
- `QuarterlyPrioritiesPageClean.jsx` - PRODUCTION Quarterly Priorities page
- `DashboardClean.jsx` - PRODUCTION Dashboard
- **DO NOT DELETE "Clean" components** - they are the active production versions
- Always check App.jsx imports to verify which version is in use

### ⚠️ ES6 Module Syntax Required
Backend uses ES6 modules (`"type": "module"` in package.json):
```javascript
// ✅ Correct
import express from 'express';
export default router;

// ❌ Wrong - causes deployment failure
const express = require('express');
module.exports = router;
```

### ⚠️ MANDATORY Rock/Priority Display Design
**ALL Rock-related pages MUST follow the elegant "Review Prior Quarter" design pattern**

The template is found in `QuarterlyPlanningMeetingPage.jsx` case 'review-quarterly-rocks' (lines ~1783-2855).

**Required Features:**
- **Employee-centric grouping** - Group by person, NOT company/individual split
- **Table layout** with columns: Expand Arrow | Status | Title | Milestone Progress | Due Date | Actions
- **Elegant milestone editing**:
  - Full-width "Add Milestone" button with `className="w-full"` for better UX
  - Inline form with text input + date field
  - Green check button (✓) and red X button for save/cancel
- **Clean expansion** - No modals, all inline editing
- **Company rock badges** - Small badge indicator for company-wide rocks
- **Polished styling** - bg-slate-50 for expanded sections, prominent hover states
- **Visual hierarchy** - Larger touch targets, clear separation between sections

**Pages that MUST follow this design:**
1. `QuarterlyPrioritiesPageClean.jsx` - Main Rocks page
2. `QuarterlyPlanningMeetingPage.jsx` - Review Prior Quarter section (the template)
3. `WeeklyAccountabilityMeetingPage.jsx` - Rock Review section
4. `DepartmentPrioritiesPage.jsx` - Department-level rocks
5. Any future Rock/Priority display components

**Design Philosophy:**
- Elegance over minimalism
- User-friendly with prominent, accessible buttons
- Clear visual hierarchy with full-width interactive elements
- Professional polish with proper spacing and breathing room

**DO NOT USE:**
- Small, subtle inline buttons for important actions
- Cramped layouts
- Modal dialogs for milestone editing
- Separate company/individual priority sections

## Technology Stack
- **Backend**: Node.js with Express (ES6 modules)
- **Frontend**: React with Vite
- **Database**: PostgreSQL (Railway)
- **Hosting**: Railway (backend), Netlify (frontend)
- **Authentication**: JWT + OAuth 2.0 (Google & Microsoft)

## URLs & Endpoints
- Production: https://axplatform.app
- API: https://api.axplatform.app/api/v1
- Railway Backend: https://eos-platform-production.up.railway.app/api/v1
- Client Subdomains: https://[client].axplatform.app

## Common Commands
```bash
# Backend
cd backend
npm run lint        # Lint backend code
npm run typecheck   # Type check (if available)

# Frontend
cd frontend
npm run lint        # Lint frontend code
npm run build       # Build for production
```

## Database Best Practices

### Database Management
- **User uses pgAdmin** for database management
- Always provide raw SQL code that can be copied and pasted into pgAdmin
- Include any necessary migration scripts as standalone SQL files

### Creating Organizations - CRITICAL
```sql
-- ✅ CORRECT: Use gen_random_uuid() for Leadership Team
INSERT INTO teams (id, name, organization_id, is_leadership_team)
VALUES (gen_random_uuid(), 'Leadership Team', <org_id>, true);

-- ❌ WRONG: Never reuse special UUIDs across orgs
```

### Business Blueprint Requirements
- **MUST have `team_id = NULL`** for organization-level blueprints
- API looks for `team_id IS NULL`, not Leadership Team UUID

### Scorecard Metrics Requirements
- **MUST have `owner` field populated** to display in UI
- Fix: `UPDATE scorecard_metrics SET owner = 'Team Name' WHERE owner IS NULL;`

### Quarterly Priorities (Rocks) - IMPORTANT
- **NEVER filter by quarter/year** when fetching priorities
- **ALWAYS use getCurrentPriorities** endpoint/pattern which fetches ALL active priorities
- The quarterly_priorities table has `quarter` as VARCHAR(2) ('Q1', 'Q2', etc.) but we don't filter by it
- Just query: `WHERE organization_id = $1 AND deleted_at IS NULL`
- This matches how the Rock Review page works - it shows all active priorities regardless of quarter

## Trademark Compliance Renames
- **vtos** → **business_blueprints**
- **rocks** → **quarterly_priorities**
- **eosi_organizations** → **consultant_organizations**
- Core values still use `vto_id` column (references `business_blueprints.id`)

## UI/UX Design System

### Core Design Elements
- **Background**: Gradient from `slate-50` via `blue-50/30` to `indigo-50/30`
- **Cards**: `white/80` with `backdrop-blur-sm` for glass-morphism
- **Borders**: `border-white/50` for subtle definition
- **Theme Colors**: Respect organization's custom colors

### Standard Patterns
```jsx
// Card Component
<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
  {/* Content */}
</div>

// Theme-Aware Gradient
style={{
  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
}}
```

## Development Guidelines

1. **Always use PostgreSQL** for data persistence
2. **Never rely on local filesystem** for storage
3. **Test features with Railway deployments** in mind
4. **Follow ES6 module syntax** in backend
5. **Run lint before committing**
6. **Check App.jsx imports** before modifying components
7. **Respect organization theme colors** in UI
8. **Update existing files** rather than creating new versions

## Ninety.io Scorecard Import System

### Overview
Comprehensive import system for migrating scorecards from Ninety.io CSV exports to AXP. Handles metrics, scores, groups, and owner mapping with intelligent deduplication.

### Architecture
- **Files**: `backend/src/controllers/scorecardImportController.js` + `backend/src/services/ninetyImportService.js`
- **Route**: `POST /api/v1/scorecard/import/monthly`
- **Frontend**: `ScorecardImportPage.jsx`
- **Process**: Preview → Owner Mapping → Execute → Verification

### Key Features

#### ✅ Intelligent Deduplication
```javascript
// Finds existing metrics by organization + team + name (case-insensitive)
const existing = await NinetyImportService.findExistingMetric(
  metric.name, teamId, organizationId, client
);

// Conflict strategies:
// - 'merge': Add new scores to existing metrics (DEFAULT)
// - 'update': Replace all scores in existing metrics  
// - 'skip': Skip existing metrics entirely
```

#### ✅ Correct Date Handling
**CRITICAL**: CSV date ranges end on Sunday, but scorecard uses Monday as week-ending.
```javascript
// CSV: "Oct 06 - Oct 12" (ends Sunday Oct 12)
// AXP: Stores as Monday Oct 13 for proper alignment
const weekEndingDate = new Date(endDate);
weekEndingDate.setDate(weekEndingDate.getDate() + 1); // Sunday → Monday
```

#### ✅ Dynamic Average Calculation
- **Import**: Ignores CSV "Average" column completely
- **Storage**: Only individual scores stored in `scorecard_scores`
- **Display**: Frontend calculates averages dynamically using `calculateAverageInRange()`
- **Database**: NO `average` column in `scorecard_metrics` table

#### ✅ Year Detection
- **Current Year**: Uses `new Date().getFullYear()` for date parsing
- **Import Logic**: "Oct 13 - Oct 19" → `2025-10-20` (current year + Monday)
- **Historical Fix**: Run SQL to update incorrectly imported 2024 dates to 2025

### CSV Format Expected
```csv
Group,Status,Title,Description,Owner,Goal,Average,Oct 06 - Oct 12,Oct 13 - Oct 19,...
Sales,,LinkedIn Posts,Daily posts,John,>= 5,4.2,3,5,4,6,2
```

### Import Process

1. **Upload & Preview**
   - Parse CSV using PapaParse
   - Transform Ninety.io format to AXP format
   - Detect conflicts with existing metrics
   - Show metrics summary and date range

2. **Owner Mapping**
   - Auto-match owner names to AXP users
   - Manual mapping for unmatched owners
   - Fuzzy matching by name and email

3. **Execute Import**
   - Create/update metrics with deduplication
   - Import all score values with correct Monday dates
   - Create scorecard groups if needed
   - Preserve goal operators and value types

4. **Verification**
   - Display import summary (created/updated/skipped)
   - Navigate to scorecard to verify data
   - Automatic date range expansion for historical data

### Critical Fixes Applied (October 2025)

#### Date Range Display Issue
**Problem**: Scorecard only showed Q4 2025, imported 2024 data was hidden.
**Solution**: `ScorecardTableClean.jsx` now auto-detects historical data and expands date range.
```javascript
// Auto-detects scores older than current quarter
if (showHistoricalData && sortedDates.length > 0) {
  const earliestDataDate = new Date(sortedDates[0]);
  if (earliestDataDate < quarterStart) {
    effectiveStartDate = earliestDataDate; // Show historical data
  }
}
```

#### Year Parsing Bug
**Problem**: Import hardcoded to 2024, causing "Oct 13" → `2024-10-13` instead of `2025-10-13`.
**Solution**: Changed to `new Date().getFullYear()` for current year detection.

#### Week-Ending Date Alignment
**Problem**: CSV "Oct 06 - Oct 12" imported as Sunday `2025-10-12`.
**Solution**: Add 1 day to get Monday `2025-10-13` for scorecard alignment.

### Database Schema
```sql
-- Metrics (metadata only, no averages stored)
scorecard_metrics:
  - id, name, description, goal, owner
  - import_source = 'ninety.io' (for tracking)
  - value_type, comparison_operator
  - NO average column (calculated dynamically)

-- Scores (individual data points)
scorecard_scores:
  - metric_id, week_date (Monday), value, notes
  - week_date format: YYYY-MM-DD (Monday dates)
```

### Troubleshooting

#### Duplicate Metrics Created
- Check `conflictStrategy` is set to 'merge' (default)
- Verify metric names match exactly (case-insensitive, trimmed)
- Check organization_id and team_id are correct
- Review deduplication logs for match details

#### Missing Historical Data
- Ensure dates were updated from 2024 to 2025 via SQL
- Check `showHistoricalData` prop is true (default)
- Verify date range calculation includes historical dates

#### Incorrect Averages
- Verify no `average` column exists in `scorecard_metrics`
- Check frontend uses `calculateAverageInRange()` utility
- Ensure individual scores are properly imported

#### Wrong Week Dates
- Verify dates are Mondays (day-of-week = 1)
- Check import adds 1 day to CSV Sunday end dates
- Run SQL to fix existing Sunday dates to Monday

### SQL Maintenance Scripts
```sql
-- Fix 2024 dates to 2025
UPDATE scorecard_scores 
SET week_date = week_date + INTERVAL '1 year'
WHERE metric_id IN (SELECT id FROM scorecard_metrics WHERE import_source = 'ninety.io')
AND week_date >= '2024-07-01' AND week_date <= '2024-12-31';

-- Fix Sunday dates to Monday  
UPDATE scorecard_scores
SET week_date = week_date + INTERVAL '1 day'
WHERE metric_id IN (SELECT id FROM scorecard_metrics WHERE import_source = 'ninety.io')
AND EXTRACT(DOW FROM week_date) = 0; -- Sunday

-- Verify import results
SELECT sm.name, COUNT(ss.id) as scores, 
       MIN(ss.week_date) as earliest, MAX(ss.week_date) as latest
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.import_source = 'ninety.io'
GROUP BY sm.name;
```

### Best Practices
1. **Always use 'merge' strategy** for incremental imports
2. **Map owners before import** for proper attribution
3. **Verify date alignment** - expect Monday week-ending dates
4. **Check scorecard display** after import for proper data visibility
5. **Run maintenance SQL** if dates need adjustment
6. **Use import_source = 'ninety.io'** for tracking imported metrics

## Common Fixes & Patterns

### Logo Management
- **Logo Size Control**: Use `logoSize` state from localStorage, apply as percentage to base dimensions
- **Prevent Flash on Navigation**: Set `logoKey` once on mount, don't update on route changes
- **Base Dimensions**: 96px height, 300px max width at 100%

### React Component Issues
- **"X is not a function" Error**: Usually missing or incorrect hook destructuring
- **Layout Double-Wrapping**: Page components shouldn't import Layout if already wrapped in App.jsx
- **Terminology Hook**: Use `const { labels } = useTerminology()` not `getTerminology`

### Database Foreign Keys
- **User References**: Always use UUID type, not INTEGER
- **Organization References**: Always use UUID type
- **Check Existing Tables**: Run queries to verify column types before creating foreign keys

### Stripe Webhook Fix (Critical)
- **Issue**: "No stripe-signature header value was provided"
- **Cause**: Webhook routes must come BEFORE express.json() middleware
- **Solution**: In server.js, place webhook routes before body parsing:
```javascript
app.use('/api/v1/webhooks', webhookRoutes);  // Raw body needed
app.use(express.json());                      // Then parse JSON
```

## Important File References

### For Detailed Documentation
- **Historical Issues**: See `CLAUDE_ARCHIVE.md`
- **OAuth Setup**: See `docs/setup/oauth.md`
- **Cloud Storage**: See `docs/setup/cloud-storage.md`
- **Creating Orgs**: See `docs/migrations/creating-organizations.md`
- **Build Optimization**: See `docs/features/netlify-build-optimization.md`

### Key Migration Files
- Special UUID migration: `SPECIAL_UUID_MIGRATION_GUIDE.md`
- Boyum org template: `migrate_boyum_simple.sql`
- Scorecard precision fix: `fix_scorecard_decimal_precision.sql`

## Recent Active Features

### Apollo.io Integration Decision (Aug 2024)
- **Decision**: Use Apollo's native features instead of complex database sync
- **Simplified Approach**: Remove prospect tables and sync infrastructure
- **Use Apollo For**: Email campaigns, website visitor tracking, lead scoring
- **Custom Tracking Domain**: track.axplatform.app configured in Netlify DNS

### Process Documentation System (Aug 2024)
- Comprehensive process management for EOS Core Processes, Scaling Up Process Maps, 4DX Standard Work, OKR Playbooks
- Supports both internal PostgreSQL storage and external cloud providers
- Features: templates, version tracking, acknowledgments, review schedules
- Migration: `create_process_documentation_tables.sql`
- Routes: `/api/v1/processes` 
- **Fix Applied**: User foreign keys must be UUID, not INTEGER

### Adaptive Framework Technology™
- Organizations can switch between EOS, 4DX, OKRs, Scaling Up methodologies
- Dynamic terminology throughout platform (menu items change based on methodology)
- Default preset available for reverting to methodology-agnostic terms
- **Terminology Defaults**: 
  - "Metrics" instead of "Scorecard" (EOS-specific)
  - "Tasks" instead of "To-Dos" (more professional)
  - "Processes" for generic, changes to "Core Processes" for EOS, etc.
- **Fix Applied**: Terminology presets must include `processes_label` and `process_singular`

### Cloud Storage Integration
- Google Drive, OneDrive, SharePoint support
- Storage Factory Pattern with provider adapters
- Complete data sovereignty for organizations

### OAuth Authentication
- Google and Microsoft OAuth 2.0
- Multi-tenant support
- Auto-links accounts by email

### Export Functionality
- Excel export for organization data
- PDF export capabilities
- Comprehensive backup options

## Environment Variables Required
```bash
# Core
JWT_SECRET=your-secret
DATABASE_URL=postgresql://...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Stripe (CRITICAL - must be set for webhooks)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe Dashboard > Webhooks

# Optional
OPENAI_API_KEY=...  # For AI features
ENABLE_MEETINGS=true # For collaborative meetings
```

## Marketing & Apollo Integration (Aug 2024)

### Strategic Decision: Apollo-Only Workflow
**Simplified from**: PhantomBuster → AXP Database → Apollo → Import back  
**To**: PhantomBuster → Apollo (direct upload) → Email campaigns

**Why**: Apollo IS the prospect CRM. No need to duplicate data in AXP.

### Apollo Configuration
- **Website Tracking**: `appId: 68aa0c1fd256ed000d90dd16` in index.html
- **Custom Domain**: `track.axplatform.app` → `brainy-figs.aploconnects.com`
- **Email**: `eric@axplatform.app` via Google Workspace
- **DNS Records Added to Netlify**:
  - MX: `SMTP.GOOGLE.COM`
  - SPF: `v=spf1 include:_spf.google.com ~all`
  - DKIM: Auto-configured by Apollo
  - CNAME: track → brainy-figs.aploconnects.com

### Apollo Best Practices
1. **Custom tracking domain CRITICAL**: 50-70% better deliverability
2. **Email warmup schedule**: Week 1: 20-30/day, Week 2: 50-75/day, Week 3: 100-150/day
3. **Web upload vs API**: Web found 160/200 (80%), API found 1/459 (0.2%)
4. **Target metrics**: 25-35% open rate, 3-5% click rate

### Current Marketing Assets
- 580 EOS Integrators identified via PhantomBuster
- 160 enriched with emails via Apollo web upload
- Website visitor tracking configured
- Conversion tracking on registration/landing pages

## Critical Webhook Configuration

### ⚠️ Stripe Webhooks MUST Come Before Body Parsing
```javascript
// ✅ CORRECT ORDER in server.js
app.use('/api/v1/webhooks', webhookRoutes);  // Raw body for Stripe signature
app.use(express.json());                      // Then parse for other routes

// ❌ WRONG ORDER - breaks Stripe signature verification
app.use(express.json());                      // Parses body first
app.use('/api/v1/webhooks', webhookRoutes);  // Too late, body already parsed!
```

This caused a 3-day production outage (Aug 20-23, 2024) where payments processed but database wasn't updated.

## Removed Features (Aug 2024)
- Prospect tracking database (6,655 lines removed)
- PhantomBuster integration 
- Apollo enrichment API
- `/sales-intelligence` route
- Use Apollo directly instead

## Session: August 26, 2025 - Patent Implementation & Data Protection

### Patent Filing Success
- **Filed**: Patent Pending Serial No. 63/870,133 for Adaptive Framework Technology™
- **Cost**: $130 as small entity
- **Technology**: World's first execution platform that adapts to any business methodology
- **Potential Value**: $5M according to previous analysis

### Adaptive Framework Implementation Started
Built foundation for the patent technology:
1. **Universal Data Schema** (`universal_objectives` table) - Framework-agnostic storage
2. **Translation Engine** - Real-time framework transformation (not just labels)
3. **Framework-specific UI components** - EOSRockCard vs OKRKeyResultCard
4. **Migration strategy** - Parallel operation, no forced migration needed

**Important**: All new schema changes are additive and won't break existing functionality.

### Soft Delete Protection Implemented
Added data recovery capability to critical tables:
```sql
-- Tables now protected with soft delete:
- quarterly_priorities (already had it)
- todos ✅ (added today)
- issues ✅ (added today)
- scorecard_metrics ✅ (added today)
- business_blueprints ✅ (added today)
- meetings ✅ (added today)
```

**How it works**: Instead of `DELETE`, uses `UPDATE SET deleted_at = NOW()`
**Recovery**: `UPDATE [table] SET deleted_at = NULL WHERE id = '[item_id]'`

### Critical Lessons Learned

#### 1. Railway File Storage Issue (Data Loss!)
- **Problem**: 3 attachments lost because stored on filesystem (`/app/uploads/`)
- **Cause**: Railway filesystem persistence issue - files lost on redeploy
- **Solution**: Store in PostgreSQL `file_data` column (already fixed Aug 14+)
- **Lost files**: Strategic Consulting needs to re-upload 3 documents from Aug 6

#### 2. Database Quarter Storage Issue
- **Problem**: Strategic Consulting's rocks had "Q3" instead of "3" in quarter field
- **Solution**: The system actually accepts both formats, but rocks must have `team_id` assigned
- **Key Learning**: Rocks with `team_id = NULL` won't show in UI

#### 3. Attachment Filename "undefined" Bug
- **Root Cause**: Backend returns camelCase (`fileName`) but frontend expected snake_case (`file_name`)
- **Solution**: Check both formats: `attachment.fileName || attachment.file_name`
- **Applied to**: QuarterlyPrioritiesPageClean.jsx and PriorityCardClean.jsx

#### 4. pgAdmin Database Connection
- **Issue**: User was querying wrong database (`postgres` instead of `railway`)
- **Solution**: Use dropdown in pgAdmin to select correct database
- **Reminder**: Always verify you're connected to the production database

### Database Migration Requirements
Run these in production (pgAdmin on railway database):
```sql
-- 1. Soft delete columns (safe, non-breaking)
ALTER TABLE business_blueprints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE scorecard_metrics ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Universal schema for patent technology (optional, additive)
-- See: backend/database/migrations/061_create_universal_schema.sql
```

### Action Items
1. **Strategic Consulting & Coaching** - Re-upload 3 lost documents
2. **Deploy frontend** - Filename fix for downloads
3. **Run SQL migrations** - Soft delete protection in production
4. **Continue patent implementation** - Hybrid framework support next

## Session: August 28, 2024 - Real-Time Meeting Collaboration (Ninety.io Style)

### Overview
Implemented comprehensive real-time meeting collaboration features similar to Ninety.io, enabling multiple participants to join meetings and see synchronized updates across all UI elements.

### Key Implementations

#### 1. Meeting Socket Infrastructure
- **WebSocket Service**: `backend/src/services/meetingSocketService.js` handles all real-time events
- **React Hook**: `frontend/src/hooks/useMeeting.js` manages socket connections and state
- **Feature Flag**: `ENABLE_MEETINGS=true` to enable/disable functionality

#### 2. Complete Sync Features Implemented

**Issues (IDS Section)**:
- ✅ Status changes (checking as solved/open)
- ✅ Voting (thumbs up synchronization)
- ✅ Creating new issues (appear for all)
- ✅ Editing issues (sync after save)
- ✅ Individual & bulk archiving
- ✅ **Drag-and-drop reordering** (critical for top 3 prioritization)

**To-Dos**:
- ✅ Status changes (checking/unchecking)
- ✅ Creating new todos
- ✅ Editing todos (sync after save)
- ✅ Individual deletion
- ✅ Bulk "Archive Done" button

**Meeting Controls**:
- ✅ Section navigation (leader controls, followers auto-navigate)
- ✅ Timer synchronization (shared start time)
- ✅ Presenter role claiming
- ✅ Meeting conclusion broadcast (everyone exits together)
- ✅ Participant list with hover tooltips

#### 3. Critical Fixes & Lessons Learned

**Stale Closure Issue**:
```javascript
// Problem: isFollowing state was stale in socket handlers
// Solution: Use refs for real-time state
const isFollowingRef = useRef(true);
useEffect(() => {
  isFollowingRef.current = isFollowing;
}, [isFollowing]);
```

**Race Condition Prevention**:
```javascript
// Problem: Both users joining as leaders
// Solution: Add delay to check existing meetings
setTimeout(() => {
  const existingMeeting = activeMeetings?.[meetingRoom];
  const hasParticipants = existingMeeting?.participantCount > 0;
  joinMeeting(meetingRoom, !hasParticipants);
}, 500);
```

**Action Mismatch Bug**:
```javascript
// Problem: Broadcasting 'status' but handler expected 'complete'
// Fix: Update handler to match broadcast action
if (action === 'status') { // Changed from 'complete'
  setTodos(prev => prev.map(t => 
    t.id === todoId ? { ...t, status, completed } : t
  ));
}
```

**Meeting Conclusion Sync**:
```javascript
// Broadcast meeting end to all participants
broadcastIssueListUpdate({
  action: 'meeting-ended',
  message: 'Meeting has been concluded by the presenter'
});
// All participants reset and reload
```

#### 4. Architecture Patterns

**Broadcast After Save Pattern**:
- Edits happen locally in modals
- Changes broadcast AFTER database save
- No "live typing" conflicts - clean, simple sync

**Leader/Follower Pattern**:
- First joiner becomes leader (presenter)
- Leader controls navigation and timer
- Followers can claim presenter role
- All participants can interact with data

**Event-Driven Updates**:
- Custom events for cross-component communication
- Socket events for cross-participant sync
- Centralized handlers for consistency

### Database Requirements
No database changes required - all meeting state is ephemeral and stored in memory on the backend.

### Testing Insights
- Tested with multiple users (Eric as leader, Bo as participant)
- Confirmed all sync features working in production
- Identified and fixed edge cases through real usage

### Future Enhancements
- Could add "who's typing" indicators (not implemented - adds complexity)
- Could add cursor positions like Google Docs (not implemented - overkill)
- Could persist meeting state to database (currently ephemeral)

---
**Note**: This is a streamlined essential reference. For historical context and detailed guides, see the archive and docs folder.