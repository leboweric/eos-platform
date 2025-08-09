# EOS Platform Migration Troubleshooting Guide

## Common Issues and Solutions

### 1. Core Values Not Showing in UI

**Problem**: Core values are in the database but not displaying in the Business Blueprint UI.

**Root Causes**:
1. Business blueprint has wrong `team_id` (should be NULL for organization-level)
2. Multiple blueprints exist, API fetches the wrong one
3. Leadership Team missing `is_leadership_team = true` flag

**Solution Steps**:
```sql
-- 1. Check existing blueprints
SELECT id, organization_id, team_id, name 
FROM business_blueprints 
WHERE organization_id = '<YOUR_ORG_ID>';

-- 2. Fix team_id to NULL for organization-level blueprint
UPDATE business_blueprints 
SET team_id = NULL 
WHERE organization_id = '<YOUR_ORG_ID>' 
AND id = '<BLUEPRINT_WITH_CORE_VALUES>';

-- 3. Delete duplicate empty blueprints
DELETE FROM business_blueprints 
WHERE organization_id = '<YOUR_ORG_ID>' 
AND id != '<BLUEPRINT_WITH_CORE_VALUES>';

-- 4. Ensure Leadership Team flag is set
UPDATE teams 
SET is_leadership_team = true 
WHERE id = '00000000-0000-0000-0000-000000000000' 
AND organization_id = '<YOUR_ORG_ID>';
```

### 2. Table Not Found Errors

**Problem**: SQL scripts reference tables that don't exist (e.g., `vtos`, `rocks`).

**Root Cause**: Trademark compliance renamed tables:
- `vtos` → `business_blueprints`
- `rocks` → `quarterly_priorities`
- `eosi_organizations` → `consultant_organizations`

**Solution**: Always use the new table names in your scripts.

### 3. Column Does Not Exist Errors

**Problem**: Scripts fail with "column does not exist" errors.

**Common Issues**:
- `users` table: No `team_id`, `is_active`, or `requires_password_change` columns
- `team_members` table: Has `joined_at` not `created_at`/`updated_at`
- `organizations` table: No `industry`, `employee_count`, `annual_revenue` columns

**Solution**: Check actual table structure before writing scripts:
```sql
-- Check table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = '<TABLE_NAME>'
ORDER BY ordinal_position;
```

### 4. Users Not Assigned to Teams

**Problem**: Users created but not appearing in team lists.

**Root Cause**: Users must be linked through `team_members` table.

**Solution**:
```sql
-- Add user to team
INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES ('<USER_ID>', '<TEAM_ID>', 'member', NOW());
```

### 5. API Not Finding Data

**Problem**: Data exists in database but API returns empty results.

**Common Causes**:
1. Wrong `team_id` or `department_id` values
2. Missing `is_leadership_team` flag
3. Incorrect foreign key relationships

**Debugging Steps**:
1. Check browser Network tab for actual API calls
2. Note the IDs being passed in the URL
3. Verify those IDs exist in the database
4. Check for NULL vs actual UUID mismatches

## Best Practices for Migrations

### Always Start With These Checks

```sql
-- 1. Verify organization exists
SELECT id, name, slug FROM organizations WHERE slug = '<ORG_SLUG>';

-- 2. Check Leadership Team setup
SELECT id, name, is_leadership_team 
FROM teams 
WHERE id = '00000000-0000-0000-0000-000000000000'
AND organization_id = '<ORG_ID>';

-- 3. Check for existing blueprints
SELECT id, team_id, name 
FROM business_blueprints 
WHERE organization_id = '<ORG_ID>';
```

### Order of Operations

1. Create organization
2. Create Leadership Team (with special UUID)
3. Set `is_leadership_team = true`
4. Create other teams
5. Create users
6. Link users to teams via `team_members`
7. Create business blueprint with `team_id = NULL`
8. Add core values, focus, etc.
9. Clean up any duplicate blueprints

### Key Rules

1. **Leadership Team UUID**: Always use `'00000000-0000-0000-0000-000000000000'`
2. **Business Blueprint**: Use `team_id = NULL` for organization-level
3. **Password Hash**: `$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq` = 'Abc123!@#'
4. **Email Format**: Verify client's actual email format before creating users
5. **Always Rollback**: Start scripts with `ROLLBACK;` to clear failed transactions

## Quick Reference SQL Templates

### Create Organization with Leadership Team
```sql
-- See migrate_boyum_simple.sql for complete template
```

### Add Core Values
```sql
-- See add_boyum_core_values_correct.sql for complete template
```

### Fix Common Issues
```sql
-- See fix_blueprint_team_id.sql for blueprint fixes
-- See fix_leadership_flag.sql for team flag fixes
```

## When to Check Logs

If issues persist after database fixes:
1. Check browser console for JavaScript errors
2. Check Network tab for API response details
3. Check backend logs for SQL query errors
4. Verify user authentication tokens are valid