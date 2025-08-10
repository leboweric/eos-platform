# Special UUID Migration Guide

## The Problem
The system was designed with a "special" Leadership Team UUID (`00000000-0000-0000-0000-000000000000`) that was meant to be shared across all organizations. This is a **critical design flaw** because:
- Only ONE organization can own this UUID at a time
- Creating a new org's Leadership Team with this UUID steals it from existing orgs
- All data linked to this UUID becomes inaccessible to the original org

## What Happened to Bennett Material Handling

When we created Boyum Barenscheer's Leadership Team with the special UUID, it inadvertently:
1. Stole the Leadership Team ownership from Bennett
2. Made all Bennett's data (linked to that UUID) inaccessible
3. Broke Bennett's 2-Page Plan menu, Scorecard, Issues, Todos, and Priorities

## The Fix Applied

### 1. Created New Leadership Team for Bennett
```sql
-- Each org needs its own Leadership Team with a regular UUID
INSERT INTO teams (id, name, organization_id, is_leadership_team)
VALUES (gen_random_uuid(), 'Leadership Team', <org_id>, true);
```

### 2. Migrated All Data
We had to move all of Bennett's data from the special UUID to their new Leadership Team ID:
- Team members
- Quarterly priorities  
- Issues
- Todos
- Scorecard metrics
- Scorecard groups

### 3. Fixed Frontend to Use Dynamic Team IDs
Updated `teamUtils.js` to dynamically find each org's Leadership Team instead of using hardcoded IDs.

## Going Forward - Best Practices

### For New Organizations
```sql
-- DO NOT use the special UUID!
-- Let each org have its own Leadership Team ID
INSERT INTO teams (
    id,  -- Use gen_random_uuid(), NOT the special UUID!
    name,
    organization_id,
    is_leadership_team,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),  -- Regular UUID
    'Leadership Team',
    <org_id>,
    true,  -- This flag is what matters for UI
    NOW(),
    NOW()
);
```

### Key Rules
1. **NEVER** reuse the special UUID `00000000-0000-0000-0000-000000000000`
2. **ALWAYS** use `gen_random_uuid()` for new teams
3. The `is_leadership_team = true` flag is what makes the UI work
4. Each organization should have exactly ONE team with `is_leadership_team = true`

### Data Migration Scripts
When moving an org away from the special UUID:

1. Create new Leadership Team
2. Update team_members
3. Update quarterly_priorities
4. Update issues
5. Update todos
6. Update scorecard_metrics
7. Update scorecard_groups

See `emergency_fix_bennett.sql` and `fix_bennett_groups.sql` for complete examples.

## Technical Debt to Address

### Backend Issues
Several controllers have hardcoded checks for the special UUID:
- quarterlyPrioritiesController.js (multiple instances)
- issuesController.js
- meetingsController.js
- aiRockAssistantController.js

These should be updated to check `is_leadership_team` flag instead.

### Database Schema
Consider adding a constraint to ensure only one team per org has `is_leadership_team = true`:
```sql
CREATE UNIQUE INDEX idx_one_leadership_team_per_org 
ON teams(organization_id) 
WHERE is_leadership_team = true;
```

## Symptoms of This Issue
If you see these symptoms, an org might be affected by the special UUID problem:
- 2-Page Plan menu item missing
- Scorecard shows no data despite metrics existing in DB
- Issues/Todos/Priorities lists are empty
- API returns 304 "Not Modified" with cached empty responses
- Data exists in database but UI shows nothing

## Emergency Fix Process
1. Identify which org currently owns the special UUID
2. Create new Leadership Team for affected org
3. Run data migration scripts
4. Clear browser cache (the 304 responses are cached!)
5. Verify all features are working

## Conclusion
The special UUID pattern is fundamentally broken for multi-tenant systems. Each organization must have its own unique Leadership Team ID. The `is_leadership_team` flag should be the sole indicator of leadership team status, not a magic UUID.