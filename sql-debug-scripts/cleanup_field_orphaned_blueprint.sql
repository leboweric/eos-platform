-- Find and clean up Field Outdoor Spaces' orphaned blueprint

-- 1. Find the orphaned blueprint
SELECT 
    'Orphaned blueprint to delete:' as action,
    bb.id as blueprint_id,
    bb.team_id as pointing_to_team,
    bb.created_at,
    CASE 
        WHEN EXISTS(SELECT 1 FROM teams WHERE id = bb.team_id) THEN 'Team exists'
        ELSE 'TEAM DOES NOT EXIST - ORPHANED'
    END as team_status
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NOT NULL;

-- 2. Check what's attached to this orphaned blueprint before deleting
SELECT 
    'Data attached to orphaned blueprint:' as check,
    bb.id as blueprint_id,
    bb.team_id,
    tp.id as three_year_picture_id,
    oyp.id as one_year_plan_id
FROM business_blueprints bb
LEFT JOIN three_year_pictures tp ON tp.vto_id = bb.id
LEFT JOIN one_year_plans oyp ON oyp.vto_id = bb.id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NOT NULL;

-- 3. Clean up the orphaned blueprint (uncomment to run)
/*
BEGIN;

-- Delete any three_year_pictures attached to orphaned blueprint
DELETE FROM three_year_pictures tp
USING business_blueprints bb, organizations o
WHERE tp.vto_id = bb.id
  AND bb.organization_id = o.id
  AND o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = bb.team_id);

-- Delete any one_year_plans attached to orphaned blueprint
DELETE FROM one_year_plans oyp
USING business_blueprints bb, organizations o
WHERE oyp.vto_id = bb.id
  AND bb.organization_id = o.id
  AND o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = bb.team_id);

-- Delete the orphaned blueprint itself
DELETE FROM business_blueprints bb
USING organizations o
WHERE bb.organization_id = o.id
  AND o.name = 'Field Outdoor Spaces'
  AND bb.team_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM teams t WHERE t.id = bb.team_id);

COMMIT;
*/

-- 4. Verify cleanup
SELECT 
    'After cleanup:' as status,
    o.name as org_name,
    COUNT(DISTINCT bb.id) as total_blueprints,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) as org_level,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) as team_level
FROM organizations o
LEFT JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE o.name = 'Field Outdoor Spaces'
GROUP BY o.name;