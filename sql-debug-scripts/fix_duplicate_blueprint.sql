-- Fix duplicate business blueprint issue

-- 1. Check which blueprint has the core values
SELECT 
    bb.id,
    bb.team_id,
    bb.name,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.team_id, bb.name;

-- 2. Check if there's any other data in the first blueprint
SELECT 
    bb.id,
    bb.name,
    bb.team_id,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values,
    (SELECT COUNT(*) FROM core_focus WHERE business_blueprint_id = bb.id) as core_focus,
    (SELECT COUNT(*) FROM ten_year_targets WHERE business_blueprint_id = bb.id) as ten_year_targets,
    (SELECT COUNT(*) FROM three_year_pictures WHERE business_blueprint_id = bb.id) as three_year_pictures
FROM business_blueprints bb
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 3. If the first blueprint (with NULL team_id) has no data, we can delete it
-- ONLY RUN THIS AFTER CONFIRMING IT HAS NO DATA:
/*
DELETE FROM business_blueprints 
WHERE id = '0cf35109-6538-4dec-847c-4ad7f8c78f3f'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
*/

-- 4. Alternative: Update the first blueprint to point to Leadership Team and move core values
-- ONLY RUN THIS IF YOU WANT TO KEEP THE FIRST BLUEPRINT:
/*
BEGIN;
-- Update the first blueprint to use Leadership Team
UPDATE business_blueprints 
SET team_id = '00000000-0000-0000-0000-000000000000',
    is_shared_with_all_teams = true,
    name = 'Business Blueprint'
WHERE id = '0cf35109-6538-4dec-847c-4ad7f8c78f3f';

-- Move core values to the first blueprint
UPDATE core_values 
SET vto_id = '0cf35109-6538-4dec-847c-4ad7f8c78f3f'
WHERE vto_id = '28d6f66d-f8de-4860-9875-a360ea4e355e';

-- Delete the second blueprint
DELETE FROM business_blueprints 
WHERE id = '28d6f66d-f8de-4860-9875-a360ea4e355e';

COMMIT;
*/