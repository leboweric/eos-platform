-- =====================================================
-- FIX LEADERSHIP TEAM ID TO USE SPECIAL UUID
-- =====================================================

-- First, check current Leadership Team
SELECT 
  'Current Leadership Team:' as info,
  id,
  name,
  is_leadership_team
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND is_leadership_team = true;

-- Update all references from old ID to special UUID
-- Note: This needs to be done in order due to foreign key constraints

-- 1. Update quarterly_priorities
UPDATE quarterly_priorities
SET team_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id = 'deeeeeee-1111-0000-0000-000000000001';

-- 2. Update scorecard_metrics if any
UPDATE scorecard_metrics
SET team_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id = 'deeeeeee-1111-0000-0000-000000000001';

-- 3. Update issues if any
UPDATE issues
SET team_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id = 'deeeeeee-1111-0000-0000-000000000001';

-- 4. Update todos if any
UPDATE todos
SET team_id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id = 'deeeeeee-1111-0000-0000-000000000001';

-- 5. Update team_members
UPDATE team_members
SET team_id = '00000000-0000-0000-0000-000000000000'
WHERE team_id = 'deeeeeee-1111-0000-0000-000000000001';

-- 6. Finally, update the teams table
UPDATE teams
SET id = '00000000-0000-0000-0000-000000000000'
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND id = 'deeeeeee-1111-0000-0000-000000000001';

-- Verify the update
SELECT 
  'Updated Leadership Team:' as info,
  id,
  name,
  is_leadership_team
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND is_leadership_team = true;

-- Check rocks are now associated with special UUID
SELECT 
  'Rocks After Update:' as info,
  COUNT(*) as rock_count,
  team_id
FROM quarterly_priorities
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND quarter = 'Q3'
  AND year = 2025
GROUP BY team_id;