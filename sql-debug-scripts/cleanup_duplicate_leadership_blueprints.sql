-- Cleanup script for duplicate Leadership Team blueprints bug
-- This fixes organizations that have both org-level and team-level blueprints for Leadership Teams

-- First, show what will be cleaned up
SELECT 
    'Will clean up:' as action,
    o.name as org_name,
    t.name as team_name,
    bb_team.id as duplicate_blueprint_id,
    bb_org.id as keeping_blueprint_id,
    tp.id as three_year_picture_id,
    oyp.id as one_year_plan_id
FROM business_blueprints bb_team
JOIN teams t ON t.id = bb_team.team_id
JOIN organizations o ON o.id = bb_team.organization_id
JOIN business_blueprints bb_org ON bb_org.organization_id = bb_team.organization_id AND bb_org.team_id IS NULL
LEFT JOIN three_year_pictures tp ON tp.vto_id = bb_team.id
LEFT JOIN one_year_plans oyp ON oyp.vto_id = bb_team.id
WHERE t.is_leadership_team = true
  AND bb_team.team_id IS NOT NULL
ORDER BY o.name;

-- The cleanup (uncomment to run)
/*
BEGIN;

-- Step 1: Delete related three_year_pictures from duplicate blueprints
DELETE FROM three_year_pictures tp
USING business_blueprints bb, teams t
WHERE tp.vto_id = bb.id
  AND bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );

-- Step 2: Delete related one_year_plans from duplicate blueprints
DELETE FROM one_year_plans oyp
USING business_blueprints bb, teams t
WHERE oyp.vto_id = bb.id
  AND bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );

-- Step 3: Delete related one_year_goals
DELETE FROM one_year_goals oyg
USING one_year_plans oyp, business_blueprints bb, teams t
WHERE oyg.one_year_plan_id = oyp.id
  AND oyp.vto_id = bb.id
  AND bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL;

-- Step 4: Delete the duplicate business_blueprints
DELETE FROM business_blueprints bb
USING teams t
WHERE bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );

COMMIT;
*/

-- Verify cleanup
SELECT 
    'After cleanup - remaining blueprints:' as check,
    o.name as org_name,
    COUNT(DISTINCT bb.id) as blueprint_count,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) as org_level_count,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) as team_level_count
FROM organizations o
JOIN business_blueprints bb ON bb.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(DISTINCT bb.id) > 1
ORDER BY blueprint_count DESC;