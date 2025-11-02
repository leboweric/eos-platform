# AXP Platform Database Schema Documentation

## Overview
The AXP platform uses PostgreSQL 16+ as its primary database with a multi-tenant architecture. This document provides comprehensive documentation of all database tables, their relationships, and usage patterns.

**Last Updated**: October 28, 2025  
**Total Tables**: 60+ (added headlines, cascading messages, completion tracking, organizational chart tables)  
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
6. [AI Meeting Assistant](#ai-meeting-assistant)
7. [Task & Issue Management](#task--issue-management)
8. [Document Management](#document-management)
9. [Headlines & Communication](#headlines--communication)
10. [Completion Tracking](#completion-tracking)
11. [Organizational Structure](#organizational-structure)
12. [Audit & Tracking](#audit--tracking)
13. [Observability & Monitoring](#observability--monitoring)
14. [Relationships & Constraints](#relationships--constraints)
15. [Migration History](#migration-history)

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

**Important Notes**:
- Uses `first_name` and `last_name` fields (no single `name` field)
- `password_hash` is required for password-based authentication

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
| core_purpose | TEXT | | Organization's core purpose/mission |
| core_values | JSONB | DEFAULT '[]' | Array of core values |
| ten_year_target | TEXT | | Long-term vision (10-year target) |
| marketing_strategy | TEXT | | Marketing strategy statement |
| three_year_target | TEXT | | Mid-term goals (3-year picture) |
| one_year_target | TEXT | | Annual objectives (1-year plan) |
| quarterly_rocks | JSONB | DEFAULT '[]' | Legacy quarterly rocks (use quarterly_priorities table instead) |
| issues_list | JSONB | DEFAULT '[]' | Legacy issues list (use issues table instead) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Important Notes**:
- Column names use `three_year_target` and `one_year_target` (not `three_year_picture` or `one_year_plan`)
- `core_values` is JSONB array (separate `core_values` table also exists for structured storage)
- `marketing_strategy` field stores the marketing strategy component of VTO
- Legacy `quarterly_rocks` and `issues_list` JSONB fields exist but should use dedicated tables instead

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
| quarter | VARCHAR(10) | | 'Q1', 'Q2', 'Q3', 'Q4' (not just '1', '2', '3', '4') |
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

### rock_milestones
Sub-goals and checkpoints for quarterly priorities (also called priority_milestones in some contexts).

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

### meeting_snapshots
Historical record of meeting outcomes and decisions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| meeting_id | UUID | FOREIGN KEY | References meetings(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| facilitator_id | UUID | FOREIGN KEY | References users(id) |
| meeting_type | VARCHAR(50) | | Type of meeting |
| meeting_date | TIMESTAMP WITH TIME ZONE | | When meeting occurred |
| duration_minutes | INTEGER | | Meeting length |
| average_rating | DECIMAL(3,1) | | Meeting rating (1-10) |
| snapshot_data | JSONB | | Full meeting data snapshot |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**snapshot_data JSONB structure**:
- `attendees`: Array of participant info
- `ai_summary`: AI-generated meeting summary
- `headlines`: {customer: [], employee: []}
- `cascading_messages`: Array of messages to cascade
- `issues`: Array with status field ('open', 'in-progress', 'resolved', 'closed')
- `todos`: Array with status field ('incomplete', 'complete', 'cancelled')
- `notes`: Meeting notes text

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

### meeting_transcripts
AI-powered meeting transcription records with real-time processing capabilities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique transcript identifier |
| meeting_id | UUID | FOREIGN KEY | References meetings(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| status | VARCHAR(50) | DEFAULT 'processing' | 'processing', 'processing_ai', 'completed', 'failed' |
| transcription_service | VARCHAR(50) | DEFAULT 'assemblyai' | Service used for transcription |
| raw_transcript | TEXT | | Full meeting transcript text |
| transcript_json | JSONB | | Structured transcript with speakers, timestamps, confidence |
| word_count | INTEGER | | Total word count |
| audio_duration_seconds | INTEGER | | Total recording duration |
| processing_started_at | TIMESTAMP WITH TIME ZONE | | When transcription began |
| processing_completed_at | TIMESTAMP WITH TIME ZONE | | When AI processing finished |
| error_message | TEXT | | Error details if processing failed |
| consent_obtained | BOOLEAN | DEFAULT false | Recording consent status |
| consent_obtained_from | JSONB | | Array of user IDs who consented |
| transcript_service_id | VARCHAR(255) | | External service session ID |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| deleted_at | TIMESTAMP WITH TIME ZONE | | Soft delete timestamp |

### meeting_ai_summaries
Comprehensive AI analysis results with GPT-4 powered insights.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique summary identifier |
| meeting_id | UUID | FOREIGN KEY | References meetings(id) |
| transcript_id | UUID | FOREIGN KEY | References meeting_transcripts(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| executive_summary | TEXT | | 2-3 paragraph meeting overview |
| key_decisions | JSONB | | Array of decisions with rationale, impact, decision maker |
| discussion_topics | JSONB | | Topics with duration, sentiment, energy level |
| action_items | JSONB | | Extracted action items with assignee, due date, priority, category |
| issues_discussed | JSONB | | Issues with status, solution, impact level, timeline |
| rocks_priorities | JSONB | | Rock/priority updates with status, progress, obstacles |
| notable_quotes | JSONB | | Significant quotes with speaker and context |
| meeting_sentiment | VARCHAR(20) | | 'positive', 'neutral', 'negative', 'mixed' |
| meeting_energy_score | INTEGER | | Energy level 1-10 |
| ai_model | VARCHAR(100) | | AI model used (e.g., 'gpt-4-turbo-preview') |
| ai_prompt_version | VARCHAR(20) | | Prompt version for tracking improvements |
| ai_processing_time_seconds | DECIMAL(10,3) | | Time taken for AI analysis |
| ai_cost_usd | DECIMAL(10,4) | | Estimated cost of AI processing |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

#### Critical Schema Debugging (October 2025)

**Production Issue**: AI Summary generation was failing due to code/schema mismatches.

**Root Cause**: Documentation and code referenced columns that didn't exist or had different names in production database.

**Schema Corrections Made**:

1. **Column Name Mismatch** - `meeting_ai_summaries`:
   ```sql
   -- ❌ WRONG (documented but doesn't exist)
   rocks_mentioned JSONB
   
   -- ✅ CORRECT (actual production column)
   rocks_priorities JSONB
   ```

2. **Removed Non-Existent Columns** from documentation:
   - `scorecard_metrics` - Not implemented in production
   - `team_dynamics` - Not implemented in production  
   - `eos_adherence` - Not implemented in production
   - `next_meeting_preparation` - Not implemented in production
   - `productivity_score` - Not implemented in production
   - `effectiveness_rating` - Not implemented in production
   - `improvement_suggestions` - Not implemented in production

3. **Key Column Data Types** - Confirmed correct:
   - `key_decisions`: TEXT[] (PostgreSQL array, not JSONB)
   - `discussion_topics`: JSONB
   - `action_items`: JSONB
   - `issues_discussed`: JSONB
   - `rocks_priorities`: JSONB
   - `notable_quotes`: JSONB

**Lessons Learned**:
- Schema documentation must exactly match production database
- Code must use actual column names, not documented assumptions
- Database introspection should verify schema before major releases
- Missing columns cause SQL errors, not graceful degradation

### transcript_access_log
Audit trail for transcript access and modifications (compliance).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| transcript_id | UUID | FOREIGN KEY | References meeting_transcripts(id) |
| user_id | UUID | FOREIGN KEY | References users(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| access_type | VARCHAR(50) | NOT NULL | 'start_transcription', 'stop_transcription', 'view', 'view_summary', 'download', 'create_todos', 'create_issues', 'soft_delete', 'hard_delete' |
| ip_address | INET | | User's IP address |
| user_agent | TEXT | | Browser/client information |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | Access timestamp |

## AI Meeting Transcription System

The AI Meeting Transcription System provides enterprise-grade real-time transcription, AI-powered analysis, and automated extraction of business insights from meetings. Built specifically for EOS methodology with comprehensive business intelligence features.

### Architecture Overview
- **Real-time Transcription**: AssemblyAI integration with custom EOS vocabulary
- **AI Analysis Engine**: GPT-4 powered meeting analysis with comprehensive business prompts
- **WebSocket Streaming**: Live audio transmission and transcript broadcasting
- **Compliance Features**: Consent management, audit logging, data retention controls

### Key Capabilities

**Real-time Processing:**
- Live audio capture with MediaRecorder API
- WebSocket streaming to AssemblyAI for real-time speech-to-text
- Custom vocabulary optimization for EOS terminology (Rocks, VTO, L10, IDS, etc.)
- Speaker identification and confidence scoring
- Live transcript broadcasting to all meeting participants

**AI-Powered Analysis:**
- Comprehensive GPT-4 prompts optimized for business meetings
- Automatic extraction of action items with assignees and deadlines
- Issue identification with impact assessment and solutions
- Rock/priority progress tracking and obstacle identification
- Team dynamics analysis and meeting effectiveness scoring
- EOS methodology adherence assessment

**Business Intelligence:**
- Meeting sentiment and energy level analysis
- Productivity and effectiveness scoring with improvement suggestions
- Key decision tracking with rationale and impact assessment
- Scorecard metric discussions with trend analysis
- Notable quotes capture with context and significance

**Integration Features:**
- One-click todo creation from AI-extracted action items
- Automatic issue creation from AI-detected problems
- Meeting history attachment with searchable transcripts
- Multi-format transcript downloads (TXT, JSON)
- Real-time notifications for AI summary completion

**Compliance & Security:**
- Comprehensive consent management system
- Detailed audit logging for all transcript access
- Soft delete protection with recovery capabilities
- GDPR-compliant data handling and retention
- Secure API endpoints with authentication

### Technical Implementation

**Backend Services:**
- `transcriptionService.js` - AssemblyAI real-time integration
- `aiSummaryService.js` - GPT-4 analysis engine
- `transcriptionController.js` - RESTful API endpoints
- Enhanced `meetingSocketService.js` - Audio streaming capabilities

**API Endpoints:**
- Health monitoring and service status
- Transcription lifecycle management (start/stop)
- AI summary retrieval and analysis
- Action item and issue creation
- Transcript access and download

**Database Schema:**
- Three-table architecture for optimal performance
- JSONB storage for flexible AI analysis results
- Comprehensive audit trail for compliance
- Soft delete protection for data recovery

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
| priority_rank | INTEGER | | Numeric priority ranking (1-10, higher = more important) |
| status | VARCHAR(20) | DEFAULT 'open' | 'open', 'in-progress', 'resolved', 'closed' |
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
| status | VARCHAR(20) | DEFAULT 'incomplete' | 'incomplete', 'complete', 'cancelled' |
| completed | BOOLEAN | DEFAULT false | Legacy field - use status instead |
| completed_at | TIMESTAMP WITH TIME ZONE | | |
| priority | VARCHAR(20) | DEFAULT 'medium' | 'low', 'medium', 'high', 'urgent' |
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

## Headlines & Communication

### headlines
Good news/bad news sharing for L10 meetings organized by team.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique headline identifier |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| team_id | UUID | FOREIGN KEY | References teams(id) |
| text | TEXT | NOT NULL | Headline content (main field used by UI) |
| type | VARCHAR(20) | DEFAULT 'good' | 'good', 'bad' - category |
| meeting_date | DATE | | Date of the meeting where headline was shared |
| created_by | UUID | FOREIGN KEY | References users(id) |
| archived | BOOLEAN | DEFAULT false | Archive status for hiding |
| archived_at | TIMESTAMP WITH TIME ZONE | | Archive timestamp |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Important Notes**:
- Primary content field is `text` (not `title` or `content`)
- `meeting_date` field tracks when the headline was shared

### cascading_messages
Message system for communicating between teams and departments.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique message identifier |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| source_team_id | UUID | FOREIGN KEY | References teams(id) - sending team |
| message | TEXT | NOT NULL | Message content |
| created_by | UUID | FOREIGN KEY | References users(id) |
| all_teams | BOOLEAN | DEFAULT false | Broadcast to all teams |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### cascading_message_recipients
Junction table tracking which teams receive each cascading message.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| message_id | UUID | FOREIGN KEY | References cascading_messages(id) |
| recipient_team_id | UUID | FOREIGN KEY | References teams(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

## Completion Tracking

### three_year_completions
Track completion states for individual items in 3-year pictures.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| three_year_picture_id | UUID | FOREIGN KEY | References three_year_pictures(id) |
| item_index | INTEGER | NOT NULL | Index of the item in the picture |
| is_completed | BOOLEAN | DEFAULT false | Completion status |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Unique Constraint**: (three_year_picture_id, item_index)

### one_year_goal_completions
Track completion states for individual goals in 1-year plans.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| one_year_plan_id | UUID | FOREIGN KEY | References one_year_plans(id) |
| goal_index | INTEGER | NOT NULL | Index of the goal in the plan |
| is_completed | BOOLEAN | DEFAULT false | Completion status |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Unique Constraint**: (one_year_plan_id, goal_index)

## Organizational Structure

### organizational_charts
Visual organizational structure with accountability mapping.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| name | VARCHAR(255) | NOT NULL | Chart name |
| description | TEXT | | Chart description |
| chart_data | JSONB | | Complete chart structure and positioning |
| is_active | BOOLEAN | DEFAULT true | Active status |
| created_by | UUID | FOREIGN KEY | References users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

### positions
Individual positions (seats) within organizational charts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| chart_id | UUID | FOREIGN KEY | References organizational_charts(id) |
| parent_position_id | UUID | FOREIGN KEY | Self-reference for hierarchy |
| title | VARCHAR(255) | NOT NULL | Position title |
| description | TEXT | | Position description |
| level | INTEGER | NOT NULL DEFAULT 0 | Hierarchy level (0 = top) |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| position_type | VARCHAR(50) | CHECK constraint | 'leadership', 'management', 'individual_contributor' |
| is_shared | BOOLEAN | DEFAULT false | Whether position can have multiple holders |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Important Notes**:
- Table name is `positions` (not `chart_positions`)
- User assignment is in separate `position_holders` table (not `user_id` column here)
- `level` field tracks hierarchy depth for easier querying

### position_holders
Links users to positions (who sits in each seat).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| position_id | UUID | FOREIGN KEY | References positions(id) |
| user_id | UUID | FOREIGN KEY | References users(id), can be NULL |
| external_name | VARCHAR(255) | | For people not in the system |
| external_email | VARCHAR(255) | | External person's email |
| start_date | DATE | | When person started in position |
| end_date | DATE | | When person left position (NULL = current) |
| is_primary | BOOLEAN | DEFAULT true | Primary holder for shared positions |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Constraint**: Either `user_id` OR (`external_name` AND `external_email`) must be provided

### position_responsibilities
Responsibilities and accountabilities for each position.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| position_id | UUID | FOREIGN KEY | References positions(id) |
| responsibility | TEXT | NOT NULL | Responsibility description |
| priority | VARCHAR(20) | CHECK constraint | 'critical', 'high', 'medium', 'low' |
| sort_order | INTEGER | DEFAULT 0 | Display order |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

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

## Observability & Monitoring

### failed_operations
Tracking system for silent failures and operations that need recovery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| user_id | UUID | FOREIGN KEY | References users(id) |
| operation_type | VARCHAR(50) | NOT NULL | Type of operation that failed |
| operation_name | VARCHAR(100) | NOT NULL | Specific operation name |
| error_message | TEXT | NOT NULL | Error description |
| error_stack | TEXT | | Full stack trace |
| context | JSONB | | Additional context for debugging |
| severity | VARCHAR(20) | DEFAULT 'error' | 'critical', 'error', 'warning', 'info' |
| resolved_at | TIMESTAMP WITH TIME ZONE | | When issue was resolved |
| resolved_by | UUID | FOREIGN KEY | References users(id) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Indexes**: organization_id, severity, resolved_at, created_at

### user_activity
Comprehensive user activity tracking for analytics and feature adoption.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| user_id | UUID | FOREIGN KEY | References users(id) |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| action_type | VARCHAR(50) | NOT NULL | Type of action performed |
| feature_name | VARCHAR(100) | NOT NULL | Feature being used |
| page_path | VARCHAR(255) | | URL path accessed |
| metadata | JSONB | | Additional action context |
| ip_address | INET | | Client IP address |
| user_agent | TEXT | | Browser/client info |
| session_id | UUID | | Session identifier |
| duration_ms | INTEGER | | Action duration in milliseconds |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Indexes**: user_id, organization_id, action_type, feature_name, created_at, session_id
**Composite Index**: (organization_id, created_at DESC) for time-range queries

### data_isolation_violations
Multi-tenant data isolation violation tracking for security monitoring.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| violation_type | VARCHAR(50) | NOT NULL | 'orphaned_record', 'missing_org_filter', 'cross_tenant_access' |
| table_name | VARCHAR(100) | NOT NULL | Table where violation occurred |
| record_id | UUID | | ID of affected record |
| organization_id | UUID | FOREIGN KEY | References organizations(id) |
| severity | VARCHAR(20) | DEFAULT 'medium' | 'critical', 'high', 'medium', 'low' |
| description | TEXT | NOT NULL | Violation description |
| query_info | JSONB | | Query context that caused violation |
| detected_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| resolved | BOOLEAN | DEFAULT FALSE | |
| resolved_at | TIMESTAMP WITH TIME ZONE | | |
| resolved_by | UUID | FOREIGN KEY | References users(id) |
| resolution_notes | TEXT | | How violation was resolved |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |

**Unique Constraint**: (table_name, record_id, violation_type)
**Indexes**: violation_type, severity, resolved, table_name, organization_id, detected_at

### isolation_check_log
Audit log for data isolation security checks performed.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | |
| check_type | VARCHAR(50) | NOT NULL | 'orphaned_records', 'missing_filters', 'full_scan' |
| table_name | VARCHAR(100) | | NULL means all tables |
| records_checked | INTEGER | DEFAULT 0 | Number of records examined |
| violations_found | INTEGER | DEFAULT 0 | Number of violations detected |
| check_duration_ms | INTEGER | | Time taken for check |
| performed_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | |
| performed_by | UUID | FOREIGN KEY | References users(id) |
| metadata | JSONB | | Additional check details |

**Indexes**: check_type, performed_at DESC, table_name

### Views

**isolation_health_status**
```sql
-- Provides quick overview of data isolation health
CREATE VIEW isolation_health_status AS
SELECT 
    COUNT(*) FILTER (WHERE resolved = false) as active_violations,
    COUNT(*) FILTER (WHERE severity = 'critical' AND resolved = false) as critical_count,
    COUNT(*) FILTER (WHERE severity = 'high' AND resolved = false) as high_count,
    COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '24 hours') as violations_24h,
    COUNT(*) FILTER (WHERE detected_at >= NOW() - INTERVAL '7 days') as violations_7d,
    MAX(detected_at) as last_violation_detected,
    (SELECT performed_at FROM isolation_check_log ORDER BY performed_at DESC LIMIT 1) as last_check_performed
FROM data_isolation_violations;
```

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
meetings → meeting_transcripts (one-to-many)
meeting_transcripts → meeting_transcript_chunks (one-to-many)

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

-- AI Meeting Assistant
CHECK (transcription_status IN ('not_started', 'recording', 'processing', 'completed', 'failed'))
CHECK (confidence >= 0.00 AND confidence <= 1.00)
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

8. **070+**: AI Meeting Assistant (October 2025)
   - meeting_transcripts table for AI-powered transcription
   - meeting_transcript_chunks for real-time streaming
   - JSONB columns for structured AI outputs
   - Consent management and audio processing

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

### Meeting Summary Updates (October 26, 2025)

#### Schema Corrections
- **Issues Table**: Corrected status enum values documentation
  - Actual values: 'open', 'in-progress', 'resolved', 'closed'
  - Previously documented incorrectly as including 'solved' and 'archived'
- **Todos Table**: Corrected status enum values documentation  
  - Actual values: 'incomplete', 'complete', 'cancelled'
  - Previously documented as 'pending', 'in_progress', 'completed'

#### Meeting Snapshots Table
- Added missing `meeting_snapshots` table documentation
- Stores historical meeting data in JSONB format
- Contains issues/todos with proper status values for categorization
- Used for generating meeting summaries and email reports

#### Data Integrity Lessons
- **Enum Validation**: Critical to verify actual database constraints match documentation
- **Status Filtering**: Meeting summary logic must use correct enum values
- **JSONB Flexibility**: snapshot_data allows schema evolution without migrations
- **Legacy Fields**: `completed` boolean on todos is legacy - use status field

---

**Last Updated**: October 28, 2025

*This database schema documentation reflects the production system as of October 2025, including major scorecard import functionality, AI Meeting Assistant transcription tables, critical schema debugging and corrections, exact column name alignment with production database, meeting snapshot system documentation, headlines and cascading messages for communication, completion tracking for strategic plans, organizational chart structure, and comprehensive observability monitoring. All enum values have been verified against actual database constraints.*