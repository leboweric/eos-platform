# Zero UUID Removal Plan

## Overview
Remove all hardcoded references to `00000000-0000-0000-0000-000000000000` from the codebase to prevent cross-organization data leakage and improve multi-tenant architecture.

## Current State
- **30+ hardcoded references** across 8 controllers/services
- **Security risk**: Cross-org data leakage (as seen with meeting summaries)
- **Technical debt**: Brittle assumptions about team structure

## Implementation Plan

### Phase 1: Add Helper Functions (Priority: HIGH)
**Files to modify**: `/backend/src/utils/teamUtils.js`

Add these utility functions:
```javascript
// Get leadership team ID for an organization
export const getLeadershipTeamId = async (organizationId) => {
  try {
    const result = await db.query(
      'SELECT id FROM teams WHERE organization_id = $1 AND is_leadership_team = true LIMIT 1',
      [organizationId]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Error getting leadership team ID:', error);
    return null;
  }
};

// Check if a team is a leadership team
export const isLeadershipTeam = async (teamId) => {
  if (!teamId) return false;
  try {
    const result = await db.query(
      'SELECT is_leadership_team FROM teams WHERE id = $1',
      [teamId]
    );
    return result.rows[0]?.is_leadership_team === true;
  } catch (error) {
    console.error('Error checking leadership team:', error);
    return false;
  }
};
```

### Phase 2: Critical Security Fixes (Priority: URGENT)

#### 1. OAuth Controllers - User Registration
**Files**: 
- `/backend/src/controllers/oauthController.js` (line 136)
- `/backend/src/controllers/microsoftOAuthController.js` (line 179)

**Current Problem**: New users are assigned to hardcoded zero UUID
**Fix**: Query for actual organization leadership team
```javascript
// Instead of hardcoded UUID in INSERT
const leadershipTeamId = await getLeadershipTeamId(organizationId);
if (leadershipTeamId) {
  // INSERT with actual leadership team ID
}
```

#### 2. Meetings Controller - Team Identification
**File**: `/backend/src/controllers/meetingsController.js`
**Lines**: 76, 105, 194, 318, 337
**Fix**: Use `isLeadershipTeam()` helper instead of UUID comparison

### Phase 3: Query Updates (Priority: HIGH)

#### 1. Quarterly Priorities Controller
**File**: `/backend/src/controllers/quarterlyPrioritiesController.js`
**Lines**: 165, 264, 1167, 1191, 1344, 1520

**SQL Query Fix Example**:
```sql
-- OLD: Hardcoded UUID check
WHERE p.team_id = '00000000-0000-0000-0000-000000000000'::uuid

-- NEW: Join with teams table
LEFT JOIN teams t ON p.team_id = t.id
WHERE t.is_leadership_team = true
```

#### 2. Issues Controller
**File**: `/backend/src/controllers/issuesController.js`
**Line**: 96
**Fix**: Check `is_leadership_team` flag instead of UUID

#### 3. Todo Reminder Service
**File**: `/backend/src/services/todoReminderService.js`
**Lines**: 53, 65, 72, 86
**Fix**: Use helper functions for leadership team checks

### Phase 4: Business Logic Updates (Priority: MEDIUM)

#### 1. Business Blueprint Controller
**File**: `/backend/src/controllers/businessBlueprintController.js`
**Lines**: 8, 74
**Fix**: Use `isLeadershipTeam()` helper

#### 2. AI Rock Assistant Controller
**File**: `/backend/src/controllers/aiRockAssistantController.js`
**Line**: 187
**Fix**: JOIN with teams table and check `is_leadership_team`

#### 3. Todo Reminders Route
**File**: `/backend/src/routes/todoReminders.js`
**Line**: 49
**Fix**: Query for actual leadership team instead of defaulting to zero UUID

### Phase 5: Testing & Verification

#### Test Scenarios
1. **New user registration** - Verify users join correct leadership team
2. **Meeting conclusions** - Ensure summaries go to correct org
3. **Quarterly priorities** - Check leadership vs department filtering
4. **Issues/Todos** - Verify org-wide vs team-specific scoping
5. **Cross-org isolation** - Confirm no data leakage between orgs

#### Verification Queries
```sql
-- Check for any remaining zero UUID references
SELECT COUNT(*) as remaining_count
FROM (
  SELECT 'team_members' as table_name, COUNT(*) as count 
  FROM team_members WHERE team_id = '00000000-0000-0000-0000-000000000000'
  UNION ALL
  SELECT 'quarterly_priorities', COUNT(*) 
  FROM quarterly_priorities WHERE team_id = '00000000-0000-0000-0000-000000000000'
  UNION ALL
  SELECT 'issues', COUNT(*) 
  FROM issues WHERE team_id = '00000000-0000-0000-0000-000000000000'
  UNION ALL
  SELECT 'todos', COUNT(*) 
  FROM todos WHERE team_id = '00000000-0000-0000-0000-000000000000'
  UNION ALL
  SELECT 'scorecard_metrics', COUNT(*) 
  FROM scorecard_metrics WHERE team_id = '00000000-0000-0000-0000-000000000000'
) counts
WHERE count > 0;
```

### Implementation Timeline

**Week 1**: 
- Add helper functions (2 hours)
- Fix OAuth controllers (2 hours)
- Fix Meetings controller (3 hours)

**Week 2**:
- Update Quarterly Priorities queries (4 hours)
- Update Issues/Todos logic (3 hours)
- Update remaining controllers (3 hours)

**Week 3**:
- Comprehensive testing (4 hours)
- Deploy to staging (1 hour)
- Monitor for issues (ongoing)

**Week 4**:
- Production deployment
- Post-deployment verification

## Success Metrics

1. **Zero UUID usage**: 0 records using `00000000-0000-0000-0000-000000000000`
2. **No hardcoded references**: All controller checks use `is_leadership_team` flag
3. **Cross-org isolation**: No data leakage between organizations
4. **Backward compatibility**: Existing organizations continue to work

## Rollback Plan

If issues arise:
1. Revert code changes
2. Run database query to reassign any misplaced data
3. Document specific failure for targeted fix

## Notes

- Migration files (028, 030, 031) contain historical references - DO NOT modify
- Each organization must have exactly one team with `is_leadership_team = true`
- Consider adding database constraint to enforce single leadership team per org

## Related Documentation

- See `SPECIAL_UUID_MIGRATION_GUIDE.md` for historical context
- See `migrate_boyum_from_zero_uuid.sql` for migration example