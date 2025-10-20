# AXP Platform Database Schema Documentation

## Overview
The AXP platform uses PostgreSQL 16+ as its primary database with a multi-tenant architecture. This document provides comprehensive documentation of all database tables, their relationships, and usage patterns.

**Last Updated**: October 2025  
**Total Tables**: 50+  
**Database Size**: ~147 MB (production)  
**Primary Key Strategy**: UUID for all tables  
**Timestamp Convention**: created_at, updated_at on all tables  
**Soft Delete Pattern**: deleted_at on critical business tables

## Table of Contents
1. [Core Tables](#core-tables)
2. [User & Authentication](#user--authentication)
3. [Strategic Planning](#strategic-planning)
4. [Performance Tracking](#performance-tracking)
5. [Meeting Management](#meeting-management)
6. [Task & Issue Management](#task--issue-management)
7. [Document Management](#document-management)
8. [Audit & Tracking](#audit--tracking)
9. [Relationships & Constraints](#relationships--constraints)
10. [Migration History](#migration-history)

## Core Tables

### organizations
Primary tenant table containing organization-level settings and preferences.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique organization identifier |
| name | VARCHAR(255) | NOT NULL | Organization display name |
| subdomain | VARCHAR(100) | UNIQUE | Custom subdomain (e.g., 'acme' for acme.axplatform.app) |
| subscription_status | VARCHAR(50) | | 'active', 'trialing', 'canceled', 'past_due' |
| stripe_customer_id | VARCHAR(255) | | Stripe customer identifier |
| stripe_subscription_id | VARCHAR(255) | | Stripe subscription identifier |
| plan_type | VARCHAR(50) | | 'starter', 'professional', 'enterprise' |
| scorecard_time_period_preference | VARCHAR(20) | DEFAULT '13_week_rolling' | '13_week_rolling', 'current_quarter', 'last_4_weeks' |
| rock_display_preference | VARCHAR(30) | DEFAULT 'grouped_by_type' | 'grouped_by_type', 'grouped_by_owner' |
| theme_primary_color | VARCHAR(7) | | Hex color for primary brand |
| theme_secondary_color | VARCHAR(7) | | Hex color for secondary brand |
| logo_url | TEXT | | Organization logo URL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Record creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Last modification timestamp |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete timestamp |

### teams
Hierarchical team structure within organizations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique team identifier |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| name | VARCHAR(255) | NOT NULL | Team name |
| parent_team_id | UUID | FOREIGN KEY | Self-reference for hierarchy |
| is_leadership_team | BOOLEAN | DEFAULT false | Marks leadership team |
| description | TEXT | | Team description |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

**Special Notes**:
- Each organization automatically gets a "Leadership Team" with is_leadership_team = true
- Teams can be nested via parent_team_id for department hierarchies

## User & Authentication

### users
Core user accounts table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique user identifier |
| email | VARCHAR(255) | NOT NULL UNIQUE | Login email |
| password_hash | TEXT | | Bcrypt hashed password |
| first_name | VARCHAR(100) | | User's first name |
| last_name | VARCHAR(100) | | User's last name |
| avatar_url | TEXT | | Profile picture URL |
| is_active | BOOLEAN | DEFAULT true | Account active status |
| email_verified | BOOLEAN | DEFAULT false | Email verification status |
| google_id | VARCHAR(255) | | Google OAuth identifier |
| microsoft_id | VARCHAR(255) | | Microsoft OAuth identifier |
| last_login | TIMESTAMP WITH TIME ZONE | | Last successful login |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### user_organizations
Junction table for user-organization membership with roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FOREIGN KEY | References users(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| role | VARCHAR(50) | DEFAULT 'member' | 'owner', 'admin', 'manager', 'member' |
| joined_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| is_active | BOOLEAN | DEFAULT true | |

**Unique Constraint**: (user_id, organization_id)

### user_login_tracking
Audit log for authentication events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FOREIGN KEY | References users(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| login_time | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Browser user agent |
| login_method | VARCHAR(50) | | 'password', 'google', 'microsoft' |

## Strategic Planning

### business_blueprints
Core strategic planning documents (formerly VTOs).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id), NULL for org-level |
| ten_year_target | TEXT | | Long-term vision |
| three_year_picture | TEXT | | Mid-term goals |
| one_year_plan | TEXT | | Annual objectives |
| quarterly_rocks_q1 | TEXT | | Q1 priorities (legacy) |
| quarterly_rocks_q2 | TEXT | | Q2 priorities (legacy) |
| quarterly_rocks_q3 | TEXT | | Q3 priorities (legacy) |
| quarterly_rocks_q4 | TEXT | | Q4 priorities (legacy) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

### core_values
Organization's core values linked to blueprints.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| vto_id | UUID | FOREIGN KEY | References business_blueprints(id) |
| name | VARCHAR(100) | NOT NULL | Value name |
| description | TEXT | | Value description |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### quarterly_priorities
Goals and objectives (formerly Rocks).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| owner_id | UUID | FOREIGN KEY | References users(id) |
| created_by | UUID | FOREIGN KEY | References users(id) |
| title | VARCHAR(500) | NOT NULL | Priority title |
| description | TEXT | | Detailed description |
| quarter | VARCHAR(2) | | 'Q1', 'Q2', 'Q3', 'Q4' or '1', '2', '3', '4' |
| year | INTEGER | | Year of the quarter |
| status | VARCHAR(50) | DEFAULT 'on_track' | 'on-track', 'off-track', 'at-risk', 'complete' |
| progress | INTEGER | DEFAULT 0 | 0-100 completion percentage |
| is_company_priority | BOOLEAN | DEFAULT false | Company-wide vs individual |
| due_date | DATE | | Target completion date |
| priority_order | INTEGER | | Display order |
| meeting_rating | INTEGER | | 1-10 rating from meetings |
| prediction | VARCHAR(50) | | Success prediction |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

### priority_milestones
Sub-goals and checkpoints for quarterly priorities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| priority_id | UUID | FOREIGN KEY | References quarterly_priorities(id) |
| title | TEXT | NOT NULL | Milestone description |
| due_date | DATE | | Target completion date |
| completed | BOOLEAN | DEFAULT false | Completion status |
| completed_at | TIMESTAMP WITH TIME ZONE | | Completion timestamp |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Important Notes**:
- No `owner_id` column (milestones inherit owner from parent priority)
- No `description` column (only title)
- No `organization_id` column (linked via priority)

## Performance Tracking

### scorecard_metrics
KPI definitions and targets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| group_id | UUID | FOREIGN KEY | References scorecard_groups(id) |
| name | VARCHAR(255) | NOT NULL | Metric name |
| description | TEXT | | Metric description |
| owner | VARCHAR(255) | | Owner name (not UUID) |
| goal | DECIMAL(20,2) | | Target value |
| type | VARCHAR(50) | DEFAULT 'weekly' | 'weekly', 'monthly', 'quarterly' |
| value_type | VARCHAR(20) | DEFAULT 'number' | 'number', 'currency', 'percentage' |
| comparison_operator | VARCHAR(20) | DEFAULT 'greater_equal' | 'equal', 'greater', 'greater_equal', 'less', 'less_equal' |
| import_source | VARCHAR(50) | | 'ninety.io', 'manual', 'api' - tracks origin |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

**Important**: The 'owner' field is VARCHAR, not a UUID foreign key

### scorecard_scores
Time-series data for metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| metric_id | UUID | FOREIGN KEY | References scorecard_metrics(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| week_date | DATE | NOT NULL | Week ending date |
| value | DECIMAL(20,2) | | Actual value |
| notes | TEXT | | Score notes |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Unique Constraint**: (metric_id, week_date)

### scorecard_groups
Grouping for scorecard metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| name | VARCHAR(255) | NOT NULL | Group name |
| description | TEXT | | Group description |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| display_order | INTEGER | DEFAULT 0 | Alternative order field |
| is_expanded | BOOLEAN | DEFAULT true | UI expansion state |
| type | VARCHAR(50) | | Group type |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

## Meeting Management

### meetings
Meeting records and configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| meeting_type | VARCHAR(50) | NOT NULL | 'weekly', 'quarterly', 'annual', etc. |
| meeting_name | VARCHAR(255) | | Custom meeting name |
| scheduled_date | DATE | | Meeting date |
| start_time | TIMESTAMP WITH TIME ZONE | | Actual start time |
| end_time | TIMESTAMP WITH TIME ZONE | | Actual end time |
| status | VARCHAR(50) | DEFAULT 'scheduled' | 'scheduled', 'in_progress', 'completed', 'canceled' |
| created_by | UUID | FOREIGN KEY | References users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

### meeting_participants
Real-time tracking of meeting attendees.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| meeting_id | UUID | FOREIGN KEY | References meetings(id) |
| user_id | UUID | FOREIGN KEY | References users(id) |
| socket_id | VARCHAR(255) | | Socket.io session ID |
| joined_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| left_at | TIMESTAMP WITH TIME ZONE | | |
| is_presenter | BOOLEAN | DEFAULT false | |
| is_active | BOOLEAN | DEFAULT true | |

### meeting_agenda_items
Pre-defined agenda items for meetings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| meeting_id | UUID | FOREIGN KEY | References meetings(id) |
| item_type | VARCHAR(50) | | 'issue', 'todo', 'priority', 'metric' |
| item_id | UUID | | Reference to specific item |
| display_order | INTEGER | DEFAULT 0 | |
| completed | BOOLEAN | DEFAULT false | |
| notes | TEXT | | |

## Task & Issue Management

### issues
IDS (Identify, Discuss, Solve) issue tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| title | VARCHAR(500) | NOT NULL | Issue title |
| description | TEXT | | Detailed description |
| created_by | UUID | FOREIGN KEY | References users(id) |
| assigned_to | UUID | FOREIGN KEY | References users(id) |
| priority | VARCHAR(20) | DEFAULT 'medium' | 'low', 'medium', 'high', 'critical' |
| status | VARCHAR(50) | DEFAULT 'open' | 'open', 'in_discussion', 'solved', 'archived' |
| upvotes | INTEGER | DEFAULT 0 | Voting count |
| display_order | INTEGER | | Manual sort order |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |
| archived_at | TIMESTAMP WITH TIME ZONE | | Archive timestamp |

### issue_votes
Tracking user votes on issues.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| issue_id | UUID | FOREIGN KEY | References issues(id) |
| user_id | UUID | FOREIGN KEY | References users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Unique Constraint**: (issue_id, user_id)

### todos
Task management system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| title | TEXT | NOT NULL | Task description |
| assigned_to | UUID | FOREIGN KEY | References users(id) |
| created_by | UUID | FOREIGN KEY | References users(id) |
| due_date | DATE | | Target completion |
| status | VARCHAR(50) | DEFAULT 'pending' | 'pending', 'in_progress', 'completed' |
| completed | BOOLEAN | DEFAULT false | |
| completed_at | TIMESTAMP WITH TIME ZONE | | |
| priority | VARCHAR(20) | DEFAULT 'medium' | |
| category | VARCHAR(50) | | Task category |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

## Document Management

### documents
Document metadata and storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| folder_id | UUID | FOREIGN KEY | References document_folders(id) |
| name | VARCHAR(255) | NOT NULL | Document name |
| file_type | VARCHAR(50) | | MIME type |
| file_size | BIGINT | | Size in bytes |
| file_content | BYTEA | | Binary content (stored in DB) |
| cloud_provider | VARCHAR(50) | | 'google_drive', 'onedrive', 'sharepoint' |
| cloud_file_id | TEXT | | External provider ID |
| uploaded_by | UUID | FOREIGN KEY | References users(id) |
| version | INTEGER | DEFAULT 1 | |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

**Important**: Documents are stored as BYTEA in PostgreSQL, not on filesystem

### document_folders
Hierarchical folder structure for documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| name | VARCHAR(255) | NOT NULL | |
| parent_folder_id | UUID | FOREIGN KEY | Self-reference |
| visibility | VARCHAR(20) | DEFAULT 'organization' | 'organization', 'team', 'personal' |
| owner_id | UUID | FOREIGN KEY | References users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### process_documentation
Core process and procedure documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| name | VARCHAR(255) | NOT NULL | Process name |
| description | TEXT | | |
| category | VARCHAR(100) | | Process category |
| content | TEXT | | Process content |
| owner_id | UUID | FOREIGN KEY | References users(id) |
| review_frequency | VARCHAR(50) | | 'monthly', 'quarterly', 'annually' |
| last_reviewed | DATE | | |
| next_review | DATE | | |
| version | INTEGER | DEFAULT 1 | |
| is_template | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete |

## Audit & Tracking

### audit_logs
General audit trail for all system actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| user_id | UUID | FOREIGN KEY | References users(id) |
| action | VARCHAR(100) | NOT NULL | Action performed |
| entity_type | VARCHAR(50) | | Table/entity affected |
| entity_id | UUID | | ID of affected record |
| old_values | JSONB | | Previous state |
| new_values | JSONB | | New state |
| ip_address | INET | | Client IP |
| user_agent | TEXT | | Browser info |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### notifications
In-app notification system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FOREIGN KEY | References users(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| type | VARCHAR(50) | NOT NULL | Notification type |
| title | VARCHAR(255) | | |
| message | TEXT | | |
| data | JSONB | | Additional payload |
| is_read | BOOLEAN | DEFAULT false | |
| read_at | TIMESTAMP WITH TIME ZONE | | |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

## Relationships & Constraints

### Primary Foreign Key Relationships

```sql
-- Organization hierarchy
organizations → teams (one-to-many)
teams → teams (self-referential for parent_team_id)

-- User associations
users ←→ organizations (many-to-many via user_organizations)
users ←→ teams (many-to-many via team_members)

-- Strategic planning cascade
business_blueprints → core_values (one-to-many)
business_blueprints → quarterly_priorities (one-to-many)
quarterly_priorities → priority_milestones (one-to-many)

-- Performance tracking
scorecard_groups → scorecard_metrics (one-to-many)
scorecard_metrics → scorecard_scores (one-to-many)

-- Meeting relationships
meetings → meeting_participants (one-to-many)
meetings → meeting_agenda_items (one-to-many)

-- Document hierarchy
document_folders → documents (one-to-many)
document_folders → document_folders (self-referential)
```

### Important Unique Constraints

- `organizations(subdomain)` - Ensures unique subdomains
- `user_organizations(user_id, organization_id)` - Prevents duplicate memberships
- `scorecard_scores(metric_id, week_date)` - One score per metric per week
- `issue_votes(issue_id, user_id)` - One vote per user per issue
- `quarterly_priorities(organization_id, team_id, quarter, year, title)` - Prevents duplicate priorities

### Check Constraints

```sql
-- Scorecard metrics
CHECK (type IN ('weekly', 'monthly', 'quarterly'))
CHECK (value_type IN ('number', 'currency', 'percentage'))
CHECK (comparison_operator IN ('equal', 'greater', 'greater_equal', 'less', 'less_equal'))

-- Organizations
CHECK (subscription_status IN ('active', 'trialing', 'canceled', 'past_due'))
CHECK (scorecard_time_period_preference IN ('13_week_rolling', 'current_quarter', 'last_4_weeks'))
CHECK (rock_display_preference IN ('grouped_by_type', 'grouped_by_owner'))

-- Issues
CHECK (priority IN ('low', 'medium', 'high', 'critical'))
CHECK (status IN ('open', 'in_discussion', 'solved', 'archived'))
```

## Migration History

### Key Migrations

1. **001-010**: Initial schema setup
   - Core tables creation
   - Basic relationships

2. **011-020**: Authentication enhancements
   - OAuth support
   - User tracking

3. **021-030**: Scorecard improvements
   - Value types and operators
   - Description fields
   - Decimal precision fixes

4. **031-040**: Document management
   - Folder structure
   - Cloud storage integration
   - Process documentation

5. **041-050**: Meeting features
   - Real-time collaboration
   - Participant tracking
   - Agenda management

6. **051-060**: Performance and soft deletes
   - Added deleted_at columns
   - Index optimizations
   - Display order fields

7. **061+**: Adaptive framework
   - Universal objectives table
   - Framework translation support
   - Terminology mappings

### Recent Schema Changes (October 2024 - October 2025)

#### Scorecard System Updates
- Added `organization_id` to `scorecard_scores` for better isolation
- Fixed column types: `owner` is VARCHAR not UUID in scorecard_metrics
- Standardized date column: `week_date` not `week_ending` in scorecard_scores
- Added `import_source` column to scorecard_metrics for tracking
- Added soft delete (`deleted_at`) to critical business tables

#### Priorities Import System Schema
- Confirmed `quarterly_priorities` uses `owner_id` column (not `assignee`)
- Confirmed `priority_milestones` has minimal schema (no owner_id, description, organization_id)
- Updated `status` values: 'complete' not 'completed' for database constraints
- Added `created_by` column to quarterly_priorities for import tracking
- Added `progress` column (replaces completion_percentage)
- Added `due_date` column for deadline tracking

## Best Practices

### Query Patterns

```sql
-- Always filter by organization for multi-tenancy
SELECT * FROM scorecard_metrics 
WHERE organization_id = $1 
AND deleted_at IS NULL;

-- Use soft deletes for data recovery
UPDATE quarterly_priorities 
SET deleted_at = NOW() 
WHERE id = $1;

-- Respect unique constraints
INSERT INTO scorecard_scores (metric_id, week_date, value, organization_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (metric_id, week_date) 
DO UPDATE SET value = EXCLUDED.value;
```

### Index Strategy

- All foreign keys have indexes for JOIN performance
- Composite indexes on (organization_id, team_id) for tenant queries
- Unique indexes enforce business rules
- Partial indexes exclude soft-deleted records

### Data Integrity Rules

1. **Never hard delete** - Use soft deletes (deleted_at) for recovery
2. **UUID primary keys** - For distributed scalability
3. **Organization isolation** - All queries must filter by organization_id
4. **Cascade deletes** - Foreign keys cascade to prevent orphans
5. **Timestamp everything** - created_at and updated_at on all tables

## October 2025 Updates - Import System Lessons

### Critical Discoveries

#### Ninety.io Priorities Import Schema Insights
- **Dual-Sheet Processing**: Excel files contain "Rocks" and "Milestones" sheets with parent-child relationships
- **Priority Matching**: Must match by organization_id + team_id + title + owner_id + quarter + year to prevent cross-contamination
- **Status Mapping**: Ninety "Done" → AXP "complete", "On-Track" → "on-track", "Off-Track" → "off-track"
- **Data Types**: Excel exports contain Date objects, serial numbers requiring careful type checking
- **Column Names**: Ninety exports use "Title"/"Status" not generic "Rock"/"% Complete"

#### Scorecard Import Architecture
- **NO AVERAGE COLUMN**: scorecard_metrics table does NOT store averages
- **Dynamic Calculation**: Frontend calculates averages using `calculateAverageInRange()`
- **Import Behavior**: CSV "Average" column is ignored during import
- **Database Query**: Only individual scores stored in scorecard_scores

#### Date Handling Requirements
- **Monday Alignment**: week_date MUST be Monday for proper scorecard display
- **Import Conversion**: CSV "Oct 06 - Oct 12" (Sunday) → 2025-10-13 (Monday)
- **Historical Support**: Database supports multi-year date ranges
- **Current Year**: Import logic uses `new Date().getFullYear()` not hardcoded year

#### Import System Database Patterns
```sql
--- Priorities deduplication (critical for preventing cross-contamination)
SELECT id, title, owner_id, quarter, year 
FROM quarterly_priorities 
WHERE organization_id = $1 
AND team_id = $2 
AND TRIM(LOWER(title)) = TRIM(LOWER($3))
AND owner_id = $4
AND quarter = $5
AND year = $6
AND deleted_at IS NULL;

--- Milestone insertion (minimal schema)
INSERT INTO priority_milestones (
  id, priority_id, title, due_date, completed, completed_at,
  created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), NOW()
);

--- Scorecard metrics deduplication
SELECT id, name FROM scorecard_metrics 
WHERE organization_id = $1 
AND team_id = $2 
AND TRIM(LOWER(name)) = TRIM(LOWER($3))
AND deleted_at IS NULL;

--- Dynamic average calculation (frontend pattern)
SELECT 
  sm.name,
  COUNT(ss.value) as score_count,
  AVG(ss.value)::numeric(10,2) as calculated_average
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = $1
AND ss.week_date >= $2 AND ss.week_date <= $3
GROUP BY sm.id, sm.name;

--- Fix Sunday dates to Monday (post-import correction)
UPDATE scorecard_scores
SET week_date = week_date + INTERVAL '1 day'
WHERE metric_id IN (
    SELECT id FROM scorecard_metrics 
    WHERE import_source = 'ninety.io'
)
AND EXTRACT(DOW FROM week_date) = 0; -- Convert Sunday to Monday

--- Verify date alignment
SELECT 
    sm.name,
    ss.week_date,
    EXTRACT(DOW FROM ss.week_date) as day_of_week,
    CASE EXTRACT(DOW FROM ss.week_date)
        WHEN 1 THEN 'Monday ✅'
        WHEN 0 THEN 'Sunday ❌'
        ELSE 'Other Day ❌'
    END as alignment_status
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON sm.id = ss.metric_id
WHERE sm.import_source = 'ninety.io'
ORDER BY ss.week_date;
```

### Import Source Tracking
- **New Column**: `import_source` in scorecard_metrics
- **Values**: 'ninety.io', 'manual', 'api', etc.
- **Purpose**: Track origin for deduplication and debugging
- **Migration**: Added in October 2025 for import system

### UI Data Requirements
- **Frontend Calculation**: All averages calculated in `scorecardDateUtils.js`
- **Historical Display**: Frontend auto-detects and shows historical data
- **Date Range Logic**: Expands from current quarter to include imported dates
- **Cell Width**: Group View requires w-28 (112px) minimum for 7-digit numbers

---

**Last Updated**: October 20, 2025

*This database schema documentation reflects the production system as of October 2025, including major scorecard import functionality and critical date handling requirements. The schema is stable with only additive changes planned.*