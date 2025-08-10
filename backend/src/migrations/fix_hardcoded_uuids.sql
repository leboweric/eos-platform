-- =====================================================
-- Add Database Constraint to Prevent Multiple Leadership Teams
-- =====================================================

-- This ensures each organization can only have ONE leadership team
-- Prevents future issues with duplicate leadership teams

-- 1. First, check if any org has multiple leadership teams
SELECT 
    o.name as org_name,
    COUNT(t.id) as leadership_team_count
FROM organizations o
JOIN teams t ON t.organization_id = o.id
WHERE t.is_leadership_team = true
GROUP BY o.id, o.name
HAVING COUNT(t.id) > 1;

-- 2. If the above returns no rows, add the constraint
-- This creates a partial unique index - only one team per org can have is_leadership_team = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_leadership_team_per_org 
ON teams(organization_id) 
WHERE is_leadership_team = true;

-- 3. Verify the constraint was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'teams'
AND indexname = 'idx_one_leadership_team_per_org';

-- =====================================================
-- Notes on Backend Code
-- =====================================================
-- The following files have hardcoded references to the special UUID
-- that should ideally be updated to check is_leadership_team flag instead:
--
-- 1. quarterlyPrioritiesController.js - Lines 163, 262, 1061, 1085, 1237, 1410
--    These check if team_id = special UUID to determine "isFromLeadership"
--    Should instead join with teams table and check is_leadership_team flag
--
-- 2. issuesController.js - Line 95
--    Checks if department_id = special UUID
--    Should check is_leadership_team flag
--
-- 3. meetingsController.js - Lines 52, 148
--    Checks if teamId = special UUID
--    Should check is_leadership_team flag
--
-- 4. aiRockAssistantController.js - Line 187
--    Queries for team_id = special UUID
--    Should check is_leadership_team flag
--
-- These are not critical for basic functionality but should be 
-- addressed for complete cleanup of technical debt.