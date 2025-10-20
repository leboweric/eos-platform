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
| title | VARCHAR(500) | NOT NULL | Priority title |
| description | TEXT | | Detailed description |
| quarter | VARCHAR(2) | | 'Q1', 'Q2', 'Q3', 'Q4' or '1', '2', '3', '4' |
| year | INTEGER | | Year of the quarter |
| status | VARCHAR(50) | DEFAULT 'on_track' | 'on_track', 'off_track', 'at_risk', 'complete' |
| completion_percentage | INTEGER | DEFAULT 0 | 0-100 completion |
| is_company_priority | BOOLEAN | DEFAULT false | Company-wide vs individual |
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
| owner_id | UUID | FOREIGN KEY | References users(id) |
| title | TEXT | NOT NULL | Milestone description |
| due_date | DATE | | Target completion date |
| completed | BOOLEAN | DEFAULT false | Completion status |
| completed_at | TIMESTAMP WITH TIME ZONE | | Completion timestamp |
| display_order | INTEGER | DEFAULT 0 | Sort order |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

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

- Added `organization_id` to `scorecard_scores` for better isolation
- Fixed column types: `owner` is VARCHAR not UUID in scorecard_metrics
- Standardized date column: `week_date` not `week_ending` in scorecard_scores
- Added soft delete (`deleted_at`) to critical business tables
- Removed non-existent columns from code (goal_direction, import_source, external_id)

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

---

*This database schema documentation is current as of October 2025. The schema continues to evolve with new features. Always check migration files for the latest changes.*