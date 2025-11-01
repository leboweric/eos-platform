# AXP Platform Observability Implementation Plan

**Created**: October 26, 2025  
**Launch Date**: ~1 week  
**Priority**: Pre-launch system visibility  
**Total Estimated Time**: 24-30 hours

## Executive Summary

This plan combines business-focused dashboards with technical deep-dive tools to provide complete visibility for the large customer launch. We already have Sentry (errors) and Better Stack (uptime), but we're missing visibility into system performance, user behavior, and silent failures.

---

## 🎯 Phase 1: Pre-Launch Essentials (Week 1 - Before Go-Live)

**Goal**: Have visibility to catch and respond to issues during launch week  
**Time Estimate**: 24-32 hours total

### Tool #1: System Health Dashboard (CRITICAL)
**Time**: 8-12 hours  
**Priority**: Must complete before launch

#### What It Shows:
- **API Performance**
  - Current requests/minute
  - Average response time (p50, p95, p99)
  - Error rate (last hour)
  - Slowest endpoints (top 5)

- **Database Health**
  - Active connections (current/max)
  - Slow query count (>500ms in last hour)
  - Slowest query (last hour)
  - Connection pool utilization %

- **WebSocket Status**
  - Active Socket.io connections
  - Connections by organization
  - Active meetings (live count)
  - Disconnection rate

- **External Services**
  - Last SendGrid response time
  - Last Stripe webhook received
  - OAuth health (Google/Microsoft)
  - OpenAI API status

- **System Resources**
  - Node.js memory usage (heap)
  - CPU usage estimate
  - Uptime
  - Last deployment time

#### Implementation Details:
```
Backend:
- New endpoint: GET /api/v1/admin/system-health
- No database table needed (real-time aggregation)
- Middleware to track request metrics in memory
- pg driver wrapper to track query performance
- Socket.io listener for connection counts

Frontend:
- New page: /admin/system-health
- Auto-refresh every 30 seconds
- Traffic light indicators (green/yellow/red)
- Clean, scannable layout
- Mobile-responsive
```

#### Success Criteria:
- [ ] Can see API response times in real-time
- [ ] Can identify slow database queries immediately
- [ ] Can see active user/meeting counts
- [ ] Can monitor external service health
- [ ] Dashboard loads in <2 seconds
- [ ] Auto-refreshes without page flicker

---

### Tool #2: Failed Operations Log (CRITICAL)
**Time**: 4-6 hours  
**Priority**: Must complete before launch

#### What It Tracks:
- **Email Failures**
  - Failed SendGrid sends
  - Recipient email
  - Error message
  - Email type (meeting summary, invitation, etc.)

- **Payment Failures**
  - Failed Stripe webhooks
  - Missed subscription events
  - Payment processing errors

- **Authentication Failures**
  - OAuth errors (Google/Microsoft)
  - Token refresh failures
  - Session validation errors

- **File Operation Failures**
  - Failed uploads
  - Failed document retrievals
  - Storage quota errors

- **WebSocket Failures**
  - Failed Socket.io connections
  - Disconnection errors
  - Meeting join failures

#### Implementation Details:
```sql
-- New Database Table
CREATE TABLE failed_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    operation_type VARCHAR(50) NOT NULL, -- 'email', 'stripe', 'oauth', 'file', 'socket'
    operation_name VARCHAR(100) NOT NULL, -- Specific operation
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB, -- Additional context
    severity VARCHAR(20) DEFAULT 'error', -- 'warning', 'error', 'critical'
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_failed_operations_created ON failed_operations(created_at DESC);
CREATE INDEX idx_failed_operations_org ON failed_operations(organization_id, created_at DESC);
CREATE INDEX idx_failed_operations_type ON failed_operations(operation_type, created_at DESC);
CREATE INDEX idx_failed_operations_unresolved ON failed_operations(resolved_at) WHERE resolved_at IS NULL;
```

```
Backend:
- New service: backend/src/services/failedOperationsService.js
- Wrapper functions for external service calls
- Controller: backend/src/controllers/failedOperationsController.js
- Routes: GET /api/v1/admin/failed-operations (with filters)
- Routes: POST /api/v1/admin/failed-operations/:id/resolve

Frontend:
- New page: /admin/failed-operations
- Table with filters (type, org, date range)
- Mark as resolved functionality
- Real-time count on system health dashboard
```

#### Success Criteria:
- [ ] All SendGrid failures logged
- [ ] All Stripe webhook failures logged
- [ ] All OAuth errors logged
- [ ] Can filter by type/org/date
- [ ] Can mark items as resolved
- [ ] Daily summary email works

---

### Tool #3: User Activity Monitor (HIGH PRIORITY)
**Time**: 4-6 hours  
**Priority**: Complete before launch if possible

#### What It Tracks:
- **Authentication Events**
  - User login/logout
  - Organization switches
  - Failed login attempts

- **Core Feature Usage**
  - Meeting started/ended (by type)
  - Priorities created/updated/completed
  - Issues created/discussed/solved
  - Scorecard entries added
  - To-dos created/completed

- **Collaboration Events**
  - Comments added
  - Files uploaded
  - Users invited
  - Teams created/modified

- **System Events**
  - Import operations (Ninety.io data)
  - Bulk operations
  - Settings changes

#### Implementation Details:
```sql
-- New Database Table
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50), -- 'priority', 'issue', 'meeting', etc.
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_org ON user_activity_log(organization_id, created_at DESC);
CREATE INDEX idx_activity_log_type ON user_activity_log(activity_type, created_at DESC);
CREATE INDEX idx_activity_log_created ON user_activity_log(created_at DESC);
```

```
Backend:
- New service: backend/src/services/activityLogService.js
- Event emitter pattern for tracking
- Controller: backend/src/controllers/activityController.js
- Routes: GET /api/v1/admin/activity (paginated, filtered)
- Integration points in all major controllers

Frontend:
- New page: /admin/user-activity
- Real-time stream (paginated)
- Filters: user, org, activity type, date range
- Search functionality
- Activity count widget on system health dashboard
```

#### Success Criteria:
- [ ] All major user actions logged
- [ ] Can filter by user/org/type
- [ ] Paginated view (50 per page)
- [ ] Search works
- [ ] Performance: <100ms to log event
- [ ] No impact on main app performance

---

### Tool #4: Data Isolation Monitor (CRITICAL SECURITY)
**Time**: 6-8 hours  
**Priority**: Must complete before launch

#### What It Prevents:
**The Risk**: With raw SQL and no ORM, one forgotten `WHERE organization_id = $1` clause means data leakage across organizations. This is your biggest security vulnerability.

**The Solution**: Automated monitoring that validates EVERY query and EVERY response to catch cross-organization data contamination.

#### What It Monitors:

**1. Query Pattern Validation (Preventive)**
- Scans all SQL queries before execution
- Detects missing `organization_id` filters on tenant-scoped tables
- Identifies queries accessing wrong organization's data
- Logs dangerous patterns
- Can block high-risk queries

**2. Response Data Validation (Detective)**
- Validates data returned before sending to client
- Checks that all `organization_id` values match user's org
- Validates team-level access
- Blocks contaminated responses
- Alerts immediately on violations

**3. Access Anomaly Detection**
- User accessing unusual number of organizations
- API calls with mismatched org parameters
- Sudden changes in data access patterns
- Cross-organization query attempts

**4. Audit Trail**
- Logs every query with validation results
- Who accessed what, from which organization
- Was the access legitimate or suspicious?
- Full forensic capability

#### Tenant-Scoped Tables (Require org_id filtering):
```javascript
const TENANT_SCOPED_TABLES = [
  'teams',
  'business_blueprints', 
  'quarterly_priorities',
  'priority_milestones',
  'scorecard_metrics',
  'scorecard_scores',
  'issues',
  'todos',
  'meetings',
  'meeting_participants',
  'meeting_snapshots',
  'process_documentation',
  'core_values',
  'meeting_notes',
  'meeting_attendees',
  'user_activity_log'
];
```

#### Implementation Details:

**Database Table:**
```sql
CREATE TABLE data_isolation_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_type VARCHAR(50) NOT NULL, -- 'missing_filter', 'wrong_org', 'response_contamination'
    severity VARCHAR(20) NOT NULL, -- 'warning', 'high', 'critical'
    user_id UUID REFERENCES users(id),
    user_organization_id UUID NOT NULL REFERENCES organizations(id),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    query_text TEXT,
    accessed_organization_ids UUID[],
    expected_organization_id UUID,
    violation_details JSONB,
    ip_address INET,
    user_agent TEXT,
    blocked BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_violations_unresolved ON data_isolation_violations(created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_violations_severity ON data_isolation_violations(severity, created_at DESC);
CREATE INDEX idx_violations_org ON data_isolation_violations(user_organization_id, created_at DESC);
CREATE INDEX idx_violations_user ON data_isolation_violations(user_id, created_at DESC);
```

**Backend Services:**
```
backend/src/services/
├── queryValidationService.js       # Validates SQL queries before execution
│   ├── validateQuery(query, userContext)
│   ├── extractTables(query)
│   ├── hasOrganizationFilter(query)
│   ├── extractOrgId(query)
│   └── checkTableRequiresOrgFilter(table)
│
├── responseValidationService.js    # Validates API responses
│   ├── validateResponse(data, userContext)
│   ├── validateArray(items, userContext)
│   ├── validateObject(obj, userContext)
│   └── checkTeamAccess(teamId, userContext)
│
└── dataIsolationService.js         # Logging and alerting
    ├── logViolation(violation)
    ├── sendCriticalAlert(violation)
    ├── getViolations(filters)
    └── resolveViolation(violationId, userId)
```

**Backend Middleware:**
```
backend/src/middleware/
├── queryValidation.js              # Wraps pg driver
│   - Intercepts all queries
│   - Validates before execution
│   - Logs violations
│   - Can block dangerous queries
│
└── responseValidation.js           # Wraps res.json()
    - Validates all API responses
    - Checks organization_id matches
    - Blocks contaminated data
    - Alerts on violations
```

**Backend Controller:**
```
backend/src/controllers/dataIsolationController.js
├── getViolations()                 # List recent violations
├── getViolationStats()             # Summary statistics
├── resolveViolation()              # Mark as resolved
└── getDangerousQueries()           # List high-risk patterns
```

**Backend Routes:**
```javascript
// backend/src/routes/admin.js
router.get('/data-isolation/violations', authenticateToken, requireRole(['owner', 'admin']), dataIsolationController.getViolations);
router.get('/data-isolation/stats', authenticateToken, requireRole(['owner', 'admin']), dataIsolationController.getViolationStats);
router.post('/data-isolation/violations/:id/resolve', authenticateToken, requireRole(['owner', 'admin']), dataIsolationController.resolveViolation);
```

**Frontend Pages:**
```
frontend/src/pages/admin/
└── DataIsolationMonitor.jsx        # Main monitoring page
    ├── Violation List (real-time)
    ├── Severity breakdown (critical/high/warning)
    ├── Filters (by user, org, type, date)
    ├── Dangerous query patterns
    ├── Organization access matrix
    └── Mark as resolved functionality
```

**Frontend Components:**
```
frontend/src/components/admin/
├── ViolationAlert.jsx              # Red/yellow alert banner
├── ViolationTable.jsx              # Sortable violations list
└── QueryInspector.jsx              # Shows query with highlighting
```

**Integration with System Health Dashboard:**

Add a new card to System Health Dashboard:
```jsx
<MetricCard
  title="Data Isolation"
  healthStatus={violations > 0 ? 'red' : 'green'}
  icon={Shield}
  metrics={[
    { 
      label: "Violations (24h)", 
      value: violations,
      alert: violations > 0,
      color: violations > 0 ? 'red' : 'green'
    },
    { 
      label: "Critical", 
      value: criticalViolations,
      alert: criticalViolations > 0 
    },
    { 
      label: "Queries Blocked", 
      value: blockedQueries 
    },
    { 
      label: "Last Check", 
      value: "Real-time" 
    }
  ]}
  onClick={() => navigate('/admin/data-isolation')}
/>
```

#### Query Validation Logic:

```javascript
// Example validation logic
class QueryValidator {
  validateQuery(queryText, userContext) {
    const normalized = queryText.toLowerCase();
    const tables = this.extractTables(normalized);
    
    // Check if any tables require org filtering
    const needsOrgFilter = tables.some(t => 
      TENANT_SCOPED_TABLES.includes(t)
    );
    
    if (needsOrgFilter) {
      // Check for organization_id in WHERE clause
      if (!this.hasOrganizationFilter(normalized)) {
        return {
          safe: false,
          severity: 'critical',
          reason: 'Missing organization_id filter',
          tables: tables,
          recommendation: 'Add WHERE organization_id = $X'
        };
      }
      
      // Check if org_id matches user's org
      const queryOrgId = this.extractOrgId(normalized);
      if (queryOrgId && queryOrgId !== userContext.organizationId) {
        return {
          safe: false,
          severity: 'critical',
          reason: 'Query accessing different organization',
          userOrg: userContext.organizationId,
          queryOrg: queryOrgId
        };
      }
    }
    
    return { safe: true };
  }
}
```

#### Response Validation Logic:

```javascript
// Example response validation
class ResponseValidator {
  validateResponse(data, userContext) {
    if (Array.isArray(data)) {
      const violations = [];
      
      for (const item of data) {
        if (item.organization_id !== userContext.organizationId) {
          violations.push({
            itemId: item.id,
            expectedOrg: userContext.organizationId,
            actualOrg: item.organization_id
          });
        }
      }
      
      return {
        safe: violations.length === 0,
        violations: violations
      };
    }
    
    return { safe: true };
  }
}
```

#### Configuration Options:

```javascript
// backend/src/config/dataIsolation.js

export const DATA_ISOLATION_CONFIG = {
  // Monitoring mode (log only vs block)
  blockDangerousQueries: false,        // Set to true after testing
  blockContaminatedResponses: true,    // Always block contaminated data
  
  // Alert thresholds
  alertOnFirstViolation: true,
  alertOnCriticalOnly: false,
  
  // Logging
  logAllQueries: false,                // Too verbose, only log violations
  logSlowQueries: true,                // Integrate with slow query monitor
  
  // Auto-resolution
  autoResolveAfterDays: 30,
  
  // Email alerts
  sendEmailOnCritical: true,
  alertEmails: ['admin@axplatform.app']
};
```

#### Success Criteria:
- [ ] Database table created with indexes
- [ ] Query validator identifies missing org filters
- [ ] Response validator catches contaminated data
- [ ] Violations logged to database
- [ ] Critical alerts sent immediately
- [ ] Admin page displays violations
- [ ] Can mark violations as resolved
- [ ] System Health Dashboard shows violation count
- [ ] Performance impact <5ms per request
- [ ] Zero false positives on known-safe queries
- [ ] Manual testing confirms blocking works

#### Testing Checklist:
- [ ] **Test 1**: Write query without org filter → Should log violation
- [ ] **Test 2**: Query with wrong org_id → Should block and alert
- [ ] **Test 3**: Response with wrong org data → Should block response
- [ ] **Test 4**: Valid query with org filter → Should pass silently
- [ ] **Test 5**: Admin access violation page → Should display data
- [ ] **Test 6**: Generate 10 violations → Should show in System Health
- [ ] **Test 7**: Resolve violation → Should update status
- [ ] **Test 8**: Performance test → Should add <5ms overhead

#### Critical Notes:
- **Start in monitor-only mode** - Don't block queries immediately
- **Review patterns** for first 48 hours to tune false positives
- **Then enable blocking** for critical violations only
- **Always block contaminated responses** - this is non-negotiable
- **Alert immediately** on critical violations (Slack/email)

---

## 🚀 Phase 2: Post-Launch Optimization (Week 2-3)

**Goal**: Deeper insights for optimization and customer success  
**Time Estimate**: 20-30 hours total

### Tool #4: Organization Health Dashboard
**Time**: 8-10 hours

#### Per-Organization Metrics:
- Active users (today, this week, this month)
- Meeting frequency and types
- Feature adoption rates
- API error rate
- Average response time
- Slow query count
- Storage usage
- Last activity timestamp
- Health score (0-100)

#### Implementation:
```
Backend:
- Aggregation queries per organization
- Endpoint: GET /api/v1/admin/organizations/:id/health
- Endpoint: GET /api/v1/admin/organizations/health-summary

Frontend:
- New page: /admin/organization-health
- Organization selector
- Traffic light health indicators
- Drill-down into specific org
- Trend charts (last 30 days)
```

---

### Tool #5: Slow Query Deep Dive
**Time**: 6-8 hours

#### What It Captures:
- Full query text
- Execution time
- Parameters (sanitized)
- Call stack / endpoint
- Organization ID
- User ID
- Timestamp
- Frequency (how often this query runs slow)

#### Implementation:
```sql
CREATE TABLE query_performance_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL, -- MD5 of normalized query
    query_text TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    endpoint VARCHAR(255),
    organization_id UUID,
    user_id UUID,
    parameters JSONB,
    stack_trace TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_query_perf_hash ON query_performance_log(query_hash, duration_ms DESC);
CREATE INDEX idx_query_perf_duration ON query_performance_log(duration_ms DESC, created_at DESC);
CREATE INDEX idx_query_perf_org ON query_performance_log(organization_id, created_at DESC);
```

```
Backend:
- Middleware for pg driver
- Only log queries >500ms
- Controller for query analysis
- Aggregate by query_hash for patterns

Frontend:
- New page: /admin/slow-queries
- Sortable table
- Group by query pattern
- Show frequency + avg duration
- Link to optimize recommendations
```

---

### Tool #6: API Endpoint Performance Tracker
**Time**: 6-8 hours

#### Metrics Per Endpoint:
- Request count
- Average response time
- p50, p95, p99 response times
- Error rate
- Slowest requests (with details)
- Trend over time

#### Implementation:
```
Backend:
- Express middleware tracking
- In-memory aggregation (rolling 24h)
- Hourly rollup to database
- Endpoint: GET /api/v1/admin/api-performance

Frontend:
- New page: /admin/api-performance
- Table of all endpoints
- Sort by response time / error rate
- Trend charts
- Identify regression
```

---

### Tool #7: Business Metrics Dashboard
**Time**: 10-14 hours

#### Key Metrics:
- **Growth Metrics**
  - New users/day
  - New organizations/day
  - User activation rate
  - Feature adoption funnel

- **Engagement Metrics**
  - Meetings per day (by type)
  - Priorities completion rate
  - Scorecard fill rate
  - Issues resolution time
  - Active users (DAU, WAU, MAU)

- **Health Metrics**
  - User retention (7-day, 30-day)
  - Meeting attendance rate
  - Feature usage distribution
  - Customer success score

#### Implementation:
```
Backend:
- Aggregation queries from activity log
- Endpoint: GET /api/v1/admin/business-metrics
- Cached results (refresh hourly)

Frontend:
- New page: /admin/business-metrics
- Key metric cards
- Trend charts (recharts)
- Exportable to CSV
```

---

## 📊 Phase 3: Advanced (Post-Stabilization)

### Tool #8: Real-time Alerts System
**Time**: 8-12 hours

#### Alert Conditions:
- Database connection pool >80%
- API response time >2s for 5 minutes
- Error rate >5% for any endpoint
- Failed operations >10 in 5 minutes
- No activity from org for 7 days
- Slow query >5 seconds

#### Delivery Channels:
- Email to admin
- Slack webhook (future)
- SMS for critical (future)

---

## 🛠️ Technical Implementation Guidelines

### Backend Architecture

```
backend/src/services/
├── observabilityService.js       # Central service
│   ├── trackQuery()
│   ├── trackApiCall()
│   ├── trackError()
│   ├── trackBusinessEvent()
│   └── getSystemHealth()
│
├── failedOperationsService.js    # Failed ops logging
├── activityLogService.js         # User activity
└── metricsAggregationService.js  # Performance rollups

backend/src/middleware/
├── requestMetrics.js             # Track all API calls
└── queryMetrics.js               # Wrap pg driver

backend/src/controllers/
├── systemHealthController.js
├── failedOperationsController.js
└── activityController.js

backend/src/routes/
└── admin.js                      # All admin routes
```

### Frontend Architecture

```
frontend/src/pages/admin/
├── SystemHealthDashboard.jsx     # Main health view
├── FailedOperationsPage.jsx      # Failed ops list
├── UserActivityPage.jsx          # Activity stream
├── OrganizationHealthPage.jsx    # Org health
├── SlowQueriesPage.jsx           # Query performance
└── BusinessMetricsPage.jsx       # Business KPIs

frontend/src/components/admin/
├── MetricCard.jsx                # Reusable metric display
├── HealthIndicator.jsx           # Traffic light
├── TrendChart.jsx                # Mini trend chart
└── ActivityFeed.jsx              # Activity stream

frontend/src/services/
└── adminService.js               # Admin API calls
```

### Database Tables Summary

```sql
-- Phase 1
failed_operations
user_activity_log

-- Phase 2
query_performance_log
api_performance_summary

-- Phase 3 (if needed)
alert_configurations
alert_history
```

---

## 🎨 UI/UX Design Guidelines

### Design Principles:
1. **Speed**: All admin pages load in <2 seconds
2. **Scannability**: Use traffic lights, cards, clear hierarchy
3. **Auto-refresh**: 30-second refresh for real-time data
4. **Mobile-friendly**: Admin checks on phone during incidents
5. **Minimal**: No clutter, focus on actionable data

### Color Coding:
- 🟢 **Green**: System healthy, <80% of threshold
- 🟡 **Yellow**: Warning, 80-95% of threshold
- 🔴 **Red**: Critical, >95% of threshold or failure

### Layout Pattern:
```
┌────────────────────────────────────────┐
│ System Health Dashboard                │
├────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│ │ API  │ │  DB  │ │Socket│ │ Ext  │  │
│ │  🟢  │ │  🟢  │ │  🟢  │ │  🟡  │  │
│ └──────┘ └──────┘ └──────┘ └──────┘  │
├────────────────────────────────────────┤
│ Recent Issues (Last Hour)              │
│ • 3 failed emails (SendGrid timeout)   │
│ • 1 slow query (scorecard aggregation) │
└────────────────────────────────────────┘
```

---

## 📋 Implementation Checklist

### Phase 1: Before Launch ✅

#### System Health Dashboard
- [ ] Backend endpoint implemented
- [ ] Request metrics middleware
- [ ] Query metrics wrapper
- [ ] Socket.io connection tracking
- [ ] External service health checks
- [ ] Frontend page created
- [ ] Auto-refresh working
- [ ] Traffic light indicators
- [ ] Mobile responsive
- [ ] Performance tested

#### Failed Operations Log
- [ ] Database table created
- [ ] Service implemented
- [ ] Email failure tracking
- [ ] Stripe failure tracking
- [ ] OAuth failure tracking
- [ ] File operation tracking
- [ ] Socket failure tracking
- [ ] Frontend page created
- [ ] Filtering works
- [ ] Mark as resolved works

#### User Activity Monitor
- [ ] Database table created
- [ ] Activity log service
- [ ] Event tracking integrated
- [ ] Frontend page created
- [ ] Pagination works
- [ ] Filtering works
- [ ] Search implemented
- [ ] Performance validated

#### Data Isolation Monitor (CRITICAL SECURITY)
- [ ] Database table created
- [ ] Query validation service
- [ ] Response validation service
- [ ] Data isolation service (logging)
- [ ] Query middleware wrapper
- [ ] Response middleware wrapper
- [ ] Frontend violations page
- [ ] System Health card updated
- [ ] Alert system configured
- [ ] Testing completed (all 8 tests)
- [ ] False positives tuned
- [ ] Blocking enabled for critical

---

## 🚨 Critical Success Metrics

### Launch Week Goals:
- [ ] Can identify system issues within 1 minute
- [ ] Can see user engagement in real-time
- [ ] Can catch silent failures immediately
- [ ] Admin dashboards load in <2 seconds
- [ ] Zero impact on app performance
- [ ] Mobile-accessible for on-call monitoring

### Post-Launch Goals:
- [ ] Mean time to detection (MTTD) <5 minutes
- [ ] Mean time to resolution (MTTR) <30 minutes
- [ ] Zero customer-reported issues we didn't already know about
- [ ] Proactive optimization based on metrics

---

## 💰 Cost Considerations

### Database Impact:
- **failed_operations**: ~1000 rows/day = ~30MB/month
- **user_activity_log**: ~10000 rows/day = ~100MB/month
- **query_performance_log**: ~500 rows/day = ~20MB/month

**Total Additional Storage**: ~150MB/month (minimal)

### Performance Impact:
- Request tracking: <1ms overhead per request
- Activity logging: Async, no user-facing impact
- Query tracking: Only for slow queries (>500ms)

**Total Performance Impact**: <2% on average response time

---

## 📚 Resources Needed

### Team Effort:
- **Claude Code**: Implement backend + frontend
- **pgAdmin**: Create database tables/indexes
- **Testing**: Manual testing in dev environment
- **Documentation**: Update CLAUDE.md with new features

### Timeline:
- **Days 1-2**: System Health Dashboard (12h)
- **Day 3**: Failed Operations Log (6h)
- **Day 4**: User Activity Monitor (6h)
- **Day 5**: Data Isolation Monitor (8h)
- **Day 6**: Testing + bug fixes (6h)
- **Day 7**: Polish + documentation (2h)

**Total**: ~40 hours over 7 days before launch

---

## 🎯 Success Definition

**We'll know this is working when:**
1. You can glance at System Health and know system status in 5 seconds
2. **You have ZERO data isolation violations** (or catch them instantly)
3. You find out about issues before customers report them
4. You can answer "how are customers using the platform?" with data
5. You can optimize performance based on actual metrics
6. You feel confident launching to the large customer knowing data is isolated

---

## 📞 On-Call Runbook (Launch Week)

### If System Health shows RED:
1. **Check Data Isolation first** - Any violations?
2. Check Failed Operations for recent errors
3. Check Slow Queries for database issues
4. Check Railway metrics for resource constraints
5. Check Better Stack for infrastructure issues
6. Check Sentry for exception patterns

### If Customer Reports Issue:
1. **Check Data Isolation** - Any violations for their org?
2. Check User Activity for their recent actions
3. Check Failed Operations for their org
4. Check System Health at time of issue
5. Check Slow Queries affecting their org

### If Data Isolation Violation Detected:
1. **IMMEDIATE**: Check violation severity
2. **CRITICAL**: Verify if data was actually leaked
3. **NOTIFY**: Alert customer if data exposure confirmed
4. **FIX**: Identify and patch the vulnerable query
5. **AUDIT**: Check for similar patterns in codebase
6. **TEST**: Verify fix prevents recurrence
7. **DOCUMENT**: Update security guidelines

### Daily Launch Week Routine:
- 8am: Check System Health Dashboard
- 8:05am: **Check Data Isolation violations** (MUST BE ZERO)
- 12pm: Review Failed Operations (mark resolved)
- 4pm: Check User Activity trends
- 8pm: Review System Health before signing off
- Daily: Export and archive critical metrics

---

**End of Plan**

## ⚠️ CRITICAL SECURITY NOTE

**Data Isolation is Non-Negotiable**: The Data Isolation Monitor (Tool #4) is the most important security tool in this plan. Without automatic ORM-level tenant scoping, you are ONE forgotten `WHERE organization_id = $1` clause away from a catastrophic data breach.

**Implementation Priority**:
1. System Health Dashboard - Know when things break
2. **Data Isolation Monitor** - Prevent data breaches
3. Failed Operations Log - Catch silent failures  
4. User Activity Monitor - Understand usage

Do not launch without the Data Isolation Monitor in place and tested.

---

*This observability plan provides comprehensive visibility for the AXP platform launch. The addition of Data Isolation Monitoring addresses the critical security risk inherent in multi-tenant systems using raw SQL. Prioritize Phase 1 tools before go-live, then iterate on Phase 2 and 3 based on actual operational needs.*
