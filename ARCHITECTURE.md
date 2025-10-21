# AXP Platform Architecture Documentation

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Core Components/Modules](#5-core-componentsmodules)
6. [Current State](#6-current-state)
7. [File/Directory Structure](#7-filedirectory-structure)
8. [Development Workflow](#8-development-workflow)
9. [Known Technical Debt & Pain Points](#9-known-technical-debt--pain-points)
10. [Immediate Roadmap](#10-immediate-roadmap)
11. [Key Architectural Decisions](#11-key-architectural-decisions)
12. [Dependencies & Integrations](#12-dependencies--integrations)

## 1. Product Overview

### What does our product do?
AXP (Adaptive Execution Platform) is the world's first business execution platform that adapts to any methodology. Unlike traditional tools that lock organizations into specific frameworks (EOS, 4DX, OKRs, Scaling Up), AXP allows seamless transformation between methodologies while preserving all data and maintaining continuity.

### Who are our target users/clients?
- **Primary**: Small to medium businesses (10-500 employees) implementing business operating systems
- **Secondary**: Business consultants and integrators who facilitate strategic planning
- **Current Focus**: EOS Implementers and their client organizations
- **Future Expansion**: 4DX coaches, OKR consultants, Scaling Up practitioners

### What problem does it solve?
1. **Methodology Lock-in**: Companies can't switch frameworks without losing historical data
2. **Tool Fragmentation**: Teams use multiple disconnected tools for strategy execution
3. **Meeting Inefficiency**: Virtual strategic meetings lack real-time collaboration
4. **Adoption Barriers**: Generic tools don't speak the language of specific methodologies

### Current Status
- **Post-beta**: Production system running since August 2024
- **Patent Filed**: Patent Pending Serial No. 63/870,133 for Adaptive Framework Technology™
- **Active Clients**: 3 organizations in production (Strategic Consulting, Boyum Consulting, Precision Building)
- **Deployment**: Live at https://axplatform.app with client subdomains

## 2. Tech Stack

### Backend
- **Runtime**: Node.js v20+ with Express.js 4.21
- **Language**: JavaScript ES6 modules (`"type": "module"`)
- **Database Driver**: pg (native PostgreSQL client) v8.13
- **Authentication**: jsonwebtoken v9.0.2 with bcryptjs v2.4.3
- **Validation**: express-validator v7.2
- **Real-time**: socket.io v4.8 for collaborative meetings
- **Email**: @sendgrid/mail v8.1
- **File Processing**: multer v1.4.5, sharp v0.33
- **Payments**: stripe v16.12
- **AI**: openai v4.72
- **Security**: helmet v8.0, cors v2.8, express-rate-limit v7.4
- **Monitoring**: @sentry/node v8.40 for error tracking

### Frontend
- **Framework**: React 19.0 with Vite 6.0
- **UI Library**: Tailwind CSS v4.0-beta with shadcn/ui components
- **Component Library**: Radix UI primitives (40+ components)
- **State Management**: zustand v5.0
- **Routing**: react-router-dom v7.1
- **Forms**: react-hook-form v7.54 with zod v3.24
- **HTTP Client**: axios v1.7
- **Charts**: recharts v2.15
- **Date Handling**: date-fns v4.1
- **Icons**: lucide-react v0.468
- **Package Manager**: pnpm v10.4.1

### Database
- **Type**: PostgreSQL 16+
- **ORM**: None (raw SQL with pg driver)
- **Hosting**: Railway managed PostgreSQL
- **Backup**: Daily automated backups via Railway
- **Management Tool**: pgAdmin for migrations and maintenance

### Infrastructure
- **Frontend Hosting**: Netlify (CDN + static hosting)
- **Backend Hosting**: Railway (containerized Node.js)
- **Domain Management**: Netlify DNS with custom subdomains
- **SSL**: Automatic Let's Encrypt certificates
- **Environment**: Multi-environment (development/staging/production)
- **Error Tracking**: Sentry for backend error monitoring and performance
- **Sentry Initialization**: ES module compatible setup with --import flag for early instrumentation
- **Uptime Monitoring**: Better Stack for service availability tracking
- **Health Checks**: Railway metrics + custom health endpoints

### Third-party Services
- **Stripe**: Payment processing and subscription management
- **SendGrid**: Transactional email delivery
- **Sentry**: Error tracking and performance monitoring
- **Better Stack**: Uptime monitoring and incident management
- **Google OAuth**: Enterprise SSO authentication
- **Microsoft OAuth**: Office 365 authentication
- **OpenAI**: AI-powered insights and suggestions
- **Apollo.io**: Website visitor tracking and lead enrichment
- **Google Drive**: Enterprise document storage
- **OneDrive/SharePoint**: Microsoft ecosystem storage

## 3. System Architecture

### High-level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  React SPA (Netlify CDN)                                   │
│  ├─ Pages (59+)                                            │
│  ├─ Components (36+)                                       │
│  ├─ Zustand Stores                                         │
│  └─ Service Layer (Axios)                                  │
├─────────────────────────────────────────────────────────────┤
│                     API Gateway Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Express.js REST API (Railway)                             │
│  ├─ JWT Authentication                                     │
│  ├─ Rate Limiting                                          │
│  ├─ CORS + Security                                        │
│  └─ WebSocket (Socket.io)                                  │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                     │
├─────────────────────────────────────────────────────────────┤
│  Controllers (40+)                                         │
│  ├─ Organization Management                                │
│  ├─ Team & User Management                                 │
│  ├─ Strategic Planning                                     │
│  ├─ Performance Tracking                                   │
│  └─ Meeting Facilitation                                   │
├─────────────────────────────────────────────────────────────┤
│                      Services Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Core Services (14+)                                       │
│  ├─ Authentication Service                                 │
│  ├─ Email Service                                          │
│  ├─ Storage Service                                        │
│  ├─ AI Service                                             │
│  └─ Meeting Socket Service                                 │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (Railway)                                      │
│  ├─ Multi-tenant Schema                                    │
│  ├─ UUID Primary Keys                                      │
│  ├─ Soft Delete Support                                    │
│  └─ Document Storage (bytea)                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Client Request** → React SPA with Axios interceptors
2. **API Gateway** → Express middleware chain (auth, rate limit, validation)
3. **Business Logic** → Controller processes request with services
4. **Data Access** → Raw SQL queries to PostgreSQL
5. **Response** → JSON response with standardized error handling
6. **Real-time Updates** → Socket.io broadcasts for collaborative features

### Authentication/Authorization Approach
- **Primary**: JWT-based authentication with short-lived access tokens (15 min)
- **Refresh**: Long-lived refresh tokens (7 days) with rotation
- **OAuth**: Google and Microsoft OAuth 2.0 for enterprise SSO
- **Multi-tenant**: Organization-based access control
- **Roles**: Admin, Manager, User roles per organization
- **Session**: HTTP-only cookies for refresh tokens, localStorage for access tokens

### API Structure
- **Version**: `/api/v1/` base path with legacy v2 support
- **Style**: RESTful resource-based endpoints
- **Format**: JSON request/response with camelCase
- **Pagination**: Limit/offset pattern for list endpoints
- **Filtering**: Query parameters for resource filtering
- **Errors**: Standardized error responses with codes

## 4. Database Schema

### Overview
- **Total Tables**: 50+ production tables
- **Architecture**: Multi-tenant with organization-based isolation
- **Primary Keys**: UUID for all tables (distributed scalability)
- **Timestamps**: created_at, updated_at on all tables
- **Soft Deletes**: deleted_at columns on critical business data

### Key Tables with Descriptions

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `organizations` | Tenant root with subscription info, scorecard display preferences, and rock grouping preferences | Parent to all tenant data |
| `users` | User accounts with auth credentials | Many-to-many with organizations |
| `user_organizations` | User-org membership and roles | Junction table with roles |
| `teams` | Hierarchical team structure | Belongs to organization |
| `business_blueprints` | Strategic plans (formerly VTOs) | Organization or team scoped |
| `quarterly_priorities` | Goals/OKRs (formerly Rocks) | Assigned to teams and users |
| `priority_milestones` | Sub-goals for priorities | Belongs to priorities |
| `scorecard_metrics` | KPI definitions | Team-scoped with targets |
| `scorecard_scores` | Time-series metric values | Weekly/monthly tracking |
| `issues` | IDS issue tracking | Team-scoped with voting |
| `todos` | Task management | User and team assignments |
| `meetings` | Meeting records | Team-based facilitation |
| `meeting_participants` | Real-time participant tracking | Socket session management |
| `process_documentation` | Core process docs | Organization procedures |
| `universal_objectives` | Patent: Framework-agnostic storage | Adaptive methodology support |
| `user_login_tracking` | User authentication audit log | Tracks login events by user/org |
| `scorecard_time_period_preference` | Org setting in organizations table | Values: 13_week_rolling, current_quarter, last_4_weeks |
| `rock_display_preference` | Org setting in organizations table | Values: grouped_by_type, grouped_by_owner |

### Important Relationships
- **Organization Hierarchy**: organizations → teams → users (many-to-many)
- **Goal Cascade**: business_blueprints → quarterly_priorities → priority_milestones
- **Performance Tracking**: scorecard_metrics → scorecard_scores (time series)
- **Meeting Flow**: meetings → issues/todos/priorities (agenda items)

### Special Indexes & Constraints
- **Unique**: Email uniqueness per organization
- **Composite Keys**: (organization_id, quarter, year) for priorities
- **Foreign Keys**: Cascade deletes for orphan prevention
- **Performance**: Indexes on all foreign keys and common query fields

### Migration Strategy
- **Tool**: pgAdmin for direct SQL execution
- **Approach**: Forward-only migrations with ALTER statements
- **Location**: `backend/database/migrations/` for version control
- **Rollback**: Manual SQL scripts when needed

## 5. Core Components/Modules

### Organization Management
- **Purpose**: Multi-tenant foundation with subscription handling
- **Key Files**: 
  - `backend/src/controllers/organizationController.js`
  - `backend/src/routes/organizations.js`
  - `frontend/src/pages/OrganizationSettingsPage.jsx`
- **Dependencies**: Stripe for subscriptions, JWT for access control
- **Status**: Complete with v2 pricing model

### Strategic Planning Module
- **Purpose**: Business blueprints, core values, focus areas
- **Key Files**:
  - `backend/src/controllers/vtoController.js` (legacy name)
  - `frontend/src/pages/VisionPage.jsx`
  - `frontend/src/components/BusinessBlueprintWizard.jsx`
- **Dependencies**: Team hierarchy, organization settings
- **Status**: Complete with multi-methodology support

### Quarterly Priorities (Rocks/OKRs)
- **Purpose**: Goal setting and tracking with milestones
- **Key Files**:
  - `backend/src/controllers/quarterlyPrioritiesController.js`
  - `frontend/src/pages/QuarterlyPrioritiesPageClean.jsx`
  - `frontend/src/components/PriorityCardClean.jsx`
- **Dependencies**: Team assignments, milestone tracking
- **Status**: Complete with drag-drop prioritization

### Scorecard Module
- **Purpose**: KPI tracking and performance monitoring
- **Key Files**:
  - `backend/src/controllers/scorecardController.js`
  - `frontend/src/pages/ScorecardPageClean.jsx`
  - `frontend/src/components/GoalChart.jsx`
- **Dependencies**: Teams, metrics definitions, time-series data
- **Status**: Complete with charts and goal tracking

### Meeting Facilitation
- **Purpose**: Structured meetings with real-time collaboration
- **Key Files**:
  - `backend/src/services/meetingSocketService.js`
  - `frontend/src/hooks/useMeeting.js`
  - `frontend/src/pages/WeeklyAccountabilityMeetingPage.jsx`
- **Dependencies**: Socket.io, team membership
- **Status**: Complete with Ninety.io-style collaboration

### Meeting Permission System (October 2025)
- **Pre-flight Permission Checks**: Leadership team members cannot start meetings for departments they're not explicitly members of
- **Race Condition Prevention**: Button disabled until permission verification completes
- **User Feedback**: Clear messaging with toast notifications and inline error text
- **API Endpoint**: `GET /api/v1/organizations/:orgId/teams/:teamId/meeting-sessions/teams/:teamId/can-start-meeting`
- **Files Modified**: 
  - Backend: `meetingSessionsController.js`, `meetingSessions.js` routes
  - Frontend: `MeetingsPage.jsx`, `meetingSessionsService.js`

### Issues Management (IDS)
- **Purpose**: Issue identification, discussion, and resolution
- **Key Files**:
  - `backend/src/controllers/issueController.js`
  - `frontend/src/components/IssueDialog.jsx`
  - `frontend/src/pages/IssuesPage.jsx`
- **Dependencies**: Team context, voting system
- **Status**: Complete with voting and archival

### Process Documentation
- **Purpose**: Core process management and documentation
- **Key Files**:
  - `backend/src/controllers/processController.js`
  - `frontend/src/pages/ProcessesPage.jsx`
- **Dependencies**: Cloud storage providers, versioning
- **Status**: Complete with template library

### Adaptive Framework Engine (Patent Pending)
- **Purpose**: Transform between methodologies without data loss
- **Key Files**:
  - `backend/src/services/frameworkTranslationService.js`
  - `frontend/src/contexts/TerminologyContext.jsx`
  - Database: `universal_objectives` table
- **Dependencies**: Terminology mappings, UI adaptations
- **Status**: In development - foundation complete

## 6. Current State

### Implemented Features
✅ **Multi-tenant Architecture** - Complete organization isolation  
✅ **User Authentication** - JWT + OAuth (Google/Microsoft)  
✅ **Team Management** - Hierarchical teams with roles  
✅ **Strategic Planning** - Business blueprints with core values  
✅ **Quarterly Priorities** - Goal tracking with milestones  
✅ **Scorecard Metrics** - KPI monitoring with charts  
✅ **Scorecard Import** - Ninety.io CSV import with deduplication  
✅ **Priorities Import** - Ninety.io Excel import with dual-sheet processing  
✅ **Meeting Facilitation** - 5 meeting types with real-time sync  
✅ **Issues Management** - IDS with voting and prioritization  
✅ **Task Management** - Todo tracking with assignments  
✅ **Process Documentation** - Core process library  
✅ **Email Integration** - Meeting summaries and notifications  
✅ **Cloud Storage** - Google Drive/OneDrive integration  
✅ **Subscription Billing** - Stripe with v2 flat-rate pricing  
✅ **Mobile Responsive** - Full mobile/tablet support  
✅ **Real-time Collaboration** - Socket.io for meetings  
✅ **Soft Delete Protection** - Data recovery capability
✅ **Configurable Scorecard Periods** - Organizations choose 13-week rolling, current quarter, or 4-week views
✅ **Configurable Rock Display** - Groups by Company/Individual or by Owner preference
✅ **Adaptive Meeting Buttons** - Single button adapts to start or join meetings based on state  

### Production Metrics
- **Uptime**: 99.9% (August - October 2024)
- **Active Organizations**: 3 production clients
- **Registered Users**: 25+ across all organizations
- **Database Size**: 147 MB (including documents)
- **API Response Time**: <100ms average
- **Frontend Load Time**: 1.2s average (Netlify CDN)
- **Meeting Concurrency**: Tested with 10+ simultaneous participants
- **Document Storage**: 50+ documents in PostgreSQL

### Recent Changes (October 2024 - October 2025)
1. **Configurable Scorecard Time Periods** - Org-level setting for quarterly vs rolling views
2. **Configurable Rock Grouping** - Display by Company/Individual or by Owner
3. **Adaptive Meeting Join Button** - Eliminates duplicate meeting risk with state-aware UI
4. **Database Schema Additions** - user_login_tracking table, scorecard org_id column
5. **Sentry ES Module Fix** - Proper initialization with --import flag
6. **Field Name Standardization** - is_company_priority used throughout for company rocks
7. **Scorecard Import Feature** - Complete Ninety.io CSV import with deduplication
8. **Database Column Fixes** - Fixed scorecard_metrics/scores schema mismatches
9. **Context Menu Updates** - Removed delete buttons from Issues, unified Rock review menus
10. **Import Data Validation** - Comprehensive column mapping and constraint validation
11. **Ninety.io Priorities Import** - Complete Excel import system with dual-sheet processing
12. **Meeting Permission System** - Pre-flight permission checks prevent leadership team members from starting department meetings they're not explicitly members of

## 7. File/Directory Structure

### Repository Organization
```
eos-platform/
├── frontend/                 # React SPA application
│   ├── src/
│   │   ├── pages/           # Route-level components (59 files)
│   │   ├── components/      # Reusable UI components (36 files)
│   │   ├── stores/          # Zustand state management (5 stores)
│   │   ├── hooks/           # Custom React hooks (5 hooks)
│   │   ├── contexts/        # React context providers (7 contexts)
│   │   ├── services/        # API service layer (29 services)
│   │   ├── utils/           # Utility functions (12 utilities)
│   │   └── App.jsx          # Main app component with routing
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
│
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Business logic (40 controllers)
│   │   ├── routes/         # API endpoints (41 route files)
│   │   ├── services/       # Core services (14 services)
│   │   ├── middleware/     # Express middleware (9 files)
│   │   ├── migrations/     # Database migrations (60+ files)
│   │   ├── config/         # Configuration files
│   │   ├── utils/          # Backend utilities
│   │   └── server.js       # Express app entry point
│   └── package.json        # Backend dependencies
│
├── docs/                    # Documentation
│   ├── setup/              # Setup guides
│   ├── features/           # Feature documentation
│   └── migrations/         # Migration guides
│
├── sql-debug-scripts/      # Database debugging utilities
├── patent/                 # Patent documentation
├── CLAUDE.md              # AI assistant instructions
├── ARCHITECTURE.md        # This file
└── [config files]         # .env, .gitignore, etc.
```

### Naming Conventions
- **Components**: PascalCase with descriptive names
- **"Clean" Suffix**: Indicates production version (e.g., `QuarterlyPrioritiesPageClean.jsx`)
- **Services**: camelCase with "Service" suffix
- **Controllers**: camelCase with "Controller" suffix
- **Database**: snake_case for tables and columns
- **API Routes**: kebab-case for URLs
- **Environment Variables**: SCREAMING_SNAKE_CASE

### Key Component Locations
- **Authentication**: `frontend/src/stores/authStore.js`
- **API Client**: `frontend/src/services/api.js`
- **Meeting Real-time**: `frontend/src/hooks/useMeeting.js`
- **Theme System**: `frontend/src/contexts/ThemeContext.jsx`
- **Terminology**: `frontend/src/contexts/TerminologyContext.jsx`
- **Main Routes**: `frontend/src/App.jsx`

## 8. Development Workflow

### How We Make Code Changes
1. **Local Development**:
   - Frontend: `cd frontend && npm run dev` (Vite dev server on :5173)
   - Backend: `cd backend && npm run dev` (Nodemon on :3001)
   - Database: Local PostgreSQL or Railway dev database

2. **Code Review Process**:
   - Direct commits to main branch (small team)
   - AI-assisted code review via Claude
   - Immediate production deployment after testing

3. **Testing Approach**:
   - Manual testing in development
   - User acceptance testing in production
   - No automated test suite currently

### Database Migrations
1. **Development**: Write SQL in `backend/database/migrations/`
2. **Testing**: Execute in pgAdmin against dev database
3. **Production**: Run same SQL in production pgAdmin
4. **Rollback**: Manual SQL scripts when needed

Example migration workflow:
```sql
-- 1. Add column (safe, non-breaking)
ALTER TABLE quarterly_priorities 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Update existing data if needed
UPDATE quarterly_priorities 
SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL;
```

### Deployment Process

#### Frontend Deployment
1. **Commit to main** → Netlify auto-deploys
2. **Build Process**: `npm run build` (Vite production build)
3. **Deploy Time**: ~60 seconds
4. **Rollback**: Netlify dashboard or git revert

#### Backend Deployment
1. **Push to GitHub** → Railway auto-deploys
2. **Build**: Docker container with Node.js
3. **Deploy Time**: ~2-3 minutes
4. **Rollback**: Railway dashboard or git revert

### Code Standards
- **Linting**: ESLint configured for both frontend/backend
- **Commands**: `npm run lint` in respective directories
- **Style**: Prettier for consistent formatting
- **Git Commits**: Descriptive messages with context

## 9. Known Technical Debt & Pain Points

### Areas Needing Refactoring
1. **Component Versions**: Multiple versions (Clean, v2, etc.) create confusion
   - Solution: Consolidate to single production version
   
2. **Legacy Naming**: Database still uses old terminology
   - `vto_id` instead of `blueprint_id`
   - `vtoController.js` instead of `blueprintController.js`
   
3. **Service Layer Inconsistency**: Some logic in controllers vs services
   - Solution: Move all business logic to service layer

### Performance Bottlenecks
1. **Large Meeting Queries**: Full participant list queries can be slow
   - Current: 100-200ms for large meetings
   - Solution: Add pagination or lazy loading
   
2. **Dashboard Loading**: Multiple parallel API calls
   - Current: 6-8 API calls on dashboard load
   - Solution: GraphQL or aggregated endpoint

3. **Document Retrieval**: Large bytea fields in PostgreSQL
   - Current: Up to 10MB documents in database
   - Solution: Consider CDN for large files

### Security Concerns
1. **Rate Limiting Complexity**: Too many different limits
   - Current: 10+ different rate limit rules
   - Solution: Simplify to 3-4 standard tiers

2. **Refresh Token Rotation**: Not fully implemented
   - Current: Static refresh tokens
   - Solution: Implement token rotation on use

### Scalability Limitations
1. **Socket.io Single Server**: No Redis adapter for scaling
   - Current: Single server for WebSocket
   - Solution: Add Redis for multi-server support

2. **Database Connection Pool**: Fixed size pool
   - Current: 20 connections max
   - Solution: Dynamic pool sizing

### Documentation Gaps
1. **Component Storybook**: No component library docs
2. **Deployment Runbook**: Missing disaster recovery procedures
3. **Testing Guide**: No test writing guidelines

## 10. Immediate Roadmap

### Features Planned (Next 1-3 Months)

#### Month 1 (November 2024)
- [ ] **Accountability Chart** - Organizational structure visualization
- [x] **Enhanced Reporting** - Executive dashboards (scorecard preferences added)
- [ ] **Bulk Operations** - Multi-select for priorities/issues
- [ ] **Notification System** - In-app notifications

#### Month 2 (December 2024)
- [ ] **Mobile App** - React Native companion app
- [ ] **Advanced Permissions** - Granular role management
- [ ] **API Documentation** - OpenAPI specification
- [ ] **Audit Trail** - Complete activity logging

#### Month 3 (January 2025)
- [ ] **4DX Methodology** - Second framework support
- [ ] **Custom Fields** - User-defined data fields
- [ ] **Workflow Automation** - Trigger-based actions
- [ ] **Data Import/Export** - CSV/Excel bulk operations

### Infrastructure Improvements
1. **Redis Integration** - For caching and WebSocket scaling
2. **CDN for Documents** - Move large files out of database
3. **Database Read Replicas** - For report generation
4. **Monitoring Stack** - Sentry or similar error tracking
5. **CI/CD Pipeline** - Automated testing before deploy

### Technical Priorities
1. **Test Coverage** - Target 80% coverage
2. **Component Consolidation** - Remove version confusion
3. **Performance Optimization** - Sub-second page loads
4. **Security Audit** - Third-party penetration testing
5. **Documentation** - Complete API and architecture docs

## 11. Key Architectural Decisions

### Why These Technologies?

#### React + Vite (Frontend)
- **Chosen For**: Fast development, excellent DX, strong ecosystem
- **Trade-off**: Larger bundle size vs vanilla JS
- **Constraint**: Team expertise in React
- **Reconsider**: Next.js for SSR/SEO benefits

#### Node.js + Express (Backend)
- **Chosen For**: JavaScript everywhere, rapid development
- **Trade-off**: Performance vs Go/Rust
- **Constraint**: Small team, need for velocity
- **Reconsider**: Fastify for better performance

#### PostgreSQL (Database)
- **Chosen For**: ACID compliance, JSON support, reliability
- **Trade-off**: Complexity vs NoSQL
- **Constraint**: Relational data model requirements
- **Maintain**: Critical for data integrity

#### Railway (Hosting)
- **Chosen For**: Simplicity, integrated PostgreSQL, fair pricing
- **Trade-off**: Less control vs AWS/GCP
- **Constraint**: Small team, limited DevOps resources
- **Reconsider**: AWS for scale beyond 1000 organizations

### Decisions We Might Reconsider

1. **No ORM**: Direct SQL is fast but increases maintenance
   - Consider: Prisma or TypeORM for type safety

2. **Monolithic Backend**: Single service for all features
   - Consider: Microservices for scale

3. **REST API**: Traditional but verbose
   - Consider: GraphQL for flexible queries

4. **No TypeScript**: Faster development but more runtime errors
   - Consider: Gradual TypeScript adoption

### Constraints We're Working Within
- **Team Size**: 2-3 developers maximum
- **Budget**: Bootstrap funding, need efficient solutions
- **Market Speed**: Fast iteration more important than perfection
- **Legacy Data**: Must support existing client data
- **Patent Requirements**: Adaptive framework is core differentiator

## 12. Dependencies & Integrations

### Critical External Services

#### Payment Processing (Stripe)
- **Version**: SDK v16.12
- **Usage**: Subscription management, payment processing
- **Criticality**: Core revenue - system unusable without it
- **Webhook Endpoint**: `/api/v1/webhooks/stripe`
- **Breaking Change Risk**: Low - Stripe maintains compatibility

#### Email Delivery (SendGrid)
- **Version**: SDK v8.1
- **Usage**: Transactional emails, meeting summaries
- **Volume**: ~500 emails/month
- **Criticality**: High - affects user communication
- **Breaking Change Risk**: Low - stable API

#### Better Stack (Uptime Monitoring)
- **Usage**: Service availability tracking and incident alerts
- **Criticality**: Medium - visibility into production issues
- **Breaking Change Risk**: Low - monitoring only

#### Authentication (OAuth Providers)
- **Google OAuth 2.0**: Enterprise SSO
- **Microsoft OAuth 2.0**: Office 365 integration
- **Criticality**: Medium - fallback to password auth
- **Breaking Change Risk**: Medium - OAuth spec changes

#### AI Services (OpenAI)
- **Version**: SDK v4.72
- **Model**: GPT-4 for insights
- **Usage**: Meeting summaries, suggestions
- **Criticality**: Low - graceful degradation
- **Breaking Change Risk**: High - rapid API evolution

### API Version Dependencies
```json
{
  "stripe": "v16.12.0 - Payment API 2024-09-30.acacia",
  "sendgrid": "v3 API - Stable",
  "google-oauth": "OAuth 2.0 - Stable", 
  "microsoft-oauth": "OAuth 2.0 v2.0 endpoint",
  "openai": "v4 API - GPT-4 model family"
}
```

### Breaking Change Risks

#### High Risk
- **OpenAI API**: Frequent updates, model deprecations
- **React 19**: Experimental version, may have breaking changes

#### Medium Risk  
- **OAuth Providers**: Scope or flow changes possible
- **Node.js**: Major version updates every 18 months

#### Low Risk
- **PostgreSQL**: Excellent backward compatibility
- **Stripe**: Versioned API with long deprecation windows
- **SendGrid**: Mature, stable API

### Dependency Management Strategy
1. **Lock Files**: Use pnpm-lock.yaml for exact versions
2. **Regular Updates**: Monthly dependency updates
3. **Staging Testing**: Test all updates in staging first
4. **Version Pinning**: Pin critical dependencies
5. **Deprecation Monitoring**: Track provider announcements

## 13. Recent Updates & Lessons Learned (October 2025)

### Major Enhancements Completed

#### Ninety.io Priorities Import System
- **Comprehensive Import**: Full Excel import from Ninety.io with dual-sheet processing
- **Files**: `prioritiesImportController.js`, `ninetyPrioritiesImportService.js`, `PrioritiesImportPage.jsx`
- **Key Features**:
  - Dual-sheet Excel parsing (Rocks + Milestones sheets)
  - Proper priority matching by title + owner + quarter + year
  - Milestone parent-child linking via Rock title matching
  - Team selection and user mapping
  - Conflict resolution strategies (merge/update/skip)
  - Excel data type handling (Date objects, serial numbers)
  - Status conversion from Ninety format to AXP format

#### Ninety.io Scorecard Import System
- **Comprehensive Import**: Full CSV import from Ninety.io with intelligent deduplication
- **Files**: `scorecardImportController.js`, `ninetyImportService.js`, `ScorecardImportPage.jsx`
- **Key Features**:
  - Conflict resolution strategies (merge/update/skip)
  - Owner mapping and user matching
  - Group creation and metric organization
  - Date range parsing with year detection
  - Dynamic average calculation (no database storage)

#### Critical Excel/Date Handling Fixes
1. **Excel Data Type Processing**: Fixed `.trim()` calls on non-string values (Date objects, numbers)
2. **Ninety.io Format Discovery**: Changed from generic "Rock"/"% Complete" to actual "Title"/"Status" columns
3. **Priority Matching Logic**: Fixed cross-contamination by matching title + owner + quarter + year
4. **Database Schema Alignment**: Fixed column references ('assignee' → 'owner_id', 'completed' → 'complete')
5. **CSV Date Parsing**: Fixed hardcoded 2024 → current year detection
6. **Week-Ending Alignment**: CSV Sunday dates → Monday scorecard dates (+1 day)
7. **Historical Data Display**: Auto-detection of imported historical data
8. **Date Range Expansion**: Scorecard shows historical data when present

#### Frontend Scorecard Improvements
- **Historical Data Support**: `ScorecardTableClean.jsx` auto-detects and includes historical scores
- **Group View Cell Width**: Fixed truncation of large numbers (w-20 → w-28)
- **Enhanced Debugging**: Comprehensive logging for import and display issues
- **Average Calculation**: Confirmed dynamic calculation vs database storage

### Critical Lessons Learned

#### Date Handling Best Practices
```javascript
// ✅ CORRECT: Use current year for imports
const currentYear = new Date().getFullYear();

// ✅ CORRECT: Convert Sunday CSV end dates to Monday scorecard dates
const weekEndingDate = new Date(endDate);
weekEndingDate.setDate(weekEndingDate.getDate() + 1);

// ✅ CORRECT: Auto-detect historical data
if (showHistoricalData && sortedDates.length > 0) {
  const earliestDataDate = new Date(sortedDates[0]);
  if (earliestDataDate < quarterStart) {
    effectiveStartDate = earliestDataDate;
  }
}
```

#### Import System Architecture
- **Excel Processing**: XLSX library with proper data type handling (Date objects, serial numbers)
- **Dual-Sheet Support**: Parse both Rocks and Milestones sheets from Ninety.io exports
- **Priority Deduplication**: Match by organization_id + team_id + title + owner_id + quarter + year
- **Milestone Linking**: Parent-child relationships via Rock title matching in priority mapping
- **Scorecard Deduplication**: Match by organization_id + team_id + name (case-insensitive)
- **Conflict Resolution**: Default to 'merge' strategy for incremental imports
- **Data Integrity**: No average storage in database, always calculate dynamically
- **Import Source Tracking**: Mark imported metrics with `import_source = 'ninety.io'`

#### UI/UX Insights
- **Cell Width Requirements**: 7-digit numbers need minimum w-28 (112px) in Tailwind
- **Whitespace Control**: Use `whitespace-nowrap` to prevent number wrapping
- **Historical Data UX**: Auto-expansion of date ranges improves user experience
- **Debug Logging**: Comprehensive logging essential for complex import debugging

### Database Schema Updates
- **Scorecard Metrics**: Added `import_source` column for tracking
- **Priority Milestones**: Confirmed schema without `description` or `organization_id` columns
- **Quarterly Priorities**: Uses `owner_id` column, not `assignee`
- **Status Values**: Database expects 'complete' not 'completed'
- **Date Storage**: Confirmed `week_date` as YYYY-MM-DD format (Monday dates)
- **No Average Column**: Verified averages are calculated dynamically, not stored

### Performance Optimizations
- **Frontend Bundle**: Maintained under 750KB gzipped
- **Import Processing**: Efficient batch operations with progress tracking
- **Date Range Queries**: Optimized to handle historical data without performance impact

### Fixed Issues & Solutions

#### Excel Data Type Errors (Priorities Import)
- **Issue**: Service crashed with "Cannot read property 'trim' of undefined"
- **Root Cause**: Calling `.trim()` on Excel Date objects and numbers
- **Solution**: Added comprehensive data type handling with safeTrim() helper

#### Wrong Column Names (Priorities Import)  
- **Issue**: Service looked for "Rock"/"% Complete" but Ninety exports "Title"/"Status"
- **Root Cause**: Assumed generic import format instead of analyzing actual export
- **Solution**: Analyzed real Ninety.io export file and updated all column references

#### Cross-User Rock Contamination (Critical)
- **Issue**: Import updating wrong person's rocks when titles matched
- **Root Cause**: Priority matching by title only, not considering owner
- **Solution**: Enhanced matching to use title + owner_id + quarter + year

#### Database Schema Mismatches (Priorities Import)
- **Issue**: INSERT errors for non-existent columns ('assignee', 'description')
- **Root Cause**: Code referenced wrong database schema
- **Solution**: Aligned all queries with actual table schemas

#### Scorecard Display Problems
- **Issue**: Imported scores not visible despite being in database
- **Root Cause**: Date filtering showing current quarter only, excluding 2024 imports
- **Solution**: Auto-detection and inclusion of historical data dates

#### Import Date Misalignment
- **Issue**: CSV "Oct 06 - Oct 12" imported as wrong year and wrong day-of-week
- **Root Cause**: Hardcoded 2024 year + Sunday end dates vs Monday expected
- **Solution**: Current year detection + 1-day adjustment for Monday alignment

#### Group View Number Truncation
- **Issue**: Large numbers like $4,085,379 truncated in Group View
- **Root Cause**: Cell width too narrow (w-20 = 80px)
- **Solution**: Increased to w-28 (112px) with whitespace-nowrap

#### Duplicate Metric Creation
- **Issue**: Import creating duplicates instead of updating existing
- **Root Cause**: Enhanced debugging revealed the existing deduplication was working correctly
- **Solution**: Confirmed conflict strategy and improved logging for transparency

### Documentation Improvements
- **CLAUDE.md**: Added comprehensive Ninety.io import system documentation
- **Troubleshooting Guides**: SQL scripts for common data fixes
- **Best Practices**: Import strategies and date handling guidelines

### Future Considerations
- **Import Source Support**: Framework ready for additional import sources
- **Date Range Preferences**: Consider user-configurable date range display
- **Large Number Display**: Monitor for other UI areas needing width adjustments
- **Import Validation**: Enhanced pre-import validation for better UX

---

**Last Updated**: October 20, 2025

*This architecture documentation represents the current state of the AXP platform as of October 2025. The system is in active development with regular updates and improvements. Major updates in October 2025 focused on scorecard import functionality, date handling, and UI improvements for large number display.*