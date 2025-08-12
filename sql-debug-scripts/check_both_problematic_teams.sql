-- Check both teams that have blueprints

-- Check if these teams exist and what they are
SELECT 
    'Team check:' as status,
    id,
    name,
    is_leadership_team,
    organization_id,
    created_at
FROM teams 
WHERE id IN ('c7b489a1-5bf4-48a5-a51d-6e5e76f8f626', 'fff1f433-8cf8-4161-883b-51d232ccef5b');

-- Both blueprints need to be deleted since:
-- 1. c7b489a1-5bf4-48a5-a51d-6e5e76f8f626 is Leadership Team (should use org-level blueprint)
-- 2. fff1f433-8cf8-4161-883b-51d232ccef5b either doesn't exist or is another error

-- Safe cleanup: Delete both team-level blueprints for Field Outdoor Spaces
BEGIN;

-- Delete three_year_pictures from both wrong blueprints
DELETE FROM three_year_pictures 
WHERE vto_id IN (
    'd67e1f76-4cd2-4699-a4a4-c95684467ba0',
    '6d6d54fc-c8a4-4d9f-a756-6c57b96c1cb2'
);

-- Delete one_year_plans from both wrong blueprints (if any)
DELETE FROM one_year_plans 
WHERE vto_id IN (
    'd67e1f76-4cd2-4699-a4a4-c95684467ba0',
    '6d6d54fc-c8a4-4d9f-a756-6c57b96c1cb2'
);

-- Delete the blueprints themselves
DELETE FROM business_blueprints 
WHERE id IN (
    'd67e1f76-4cd2-4699-a4a4-c95684467ba0',
    '6d6d54fc-c8a4-4d9f-a756-6c57b96c1cb2'
);

COMMIT;

-- Verify Field Outdoor Spaces now has only 1 org-level blueprint
SELECT 
    o.name as org_name,
    COUNT(bb.id) as total_blueprints,
    COUNT(CASE WHEN bb.team_id IS NULL THEN 1 END) as org_level_blueprints,
    COUNT(CASE WHEN bb.team_id IS NOT NULL THEN 1 END) as team_level_blueprints
FROM organizations o
LEFT JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE o.name = 'Field Outdoor Spaces'
GROUP BY o.name;