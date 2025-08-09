-- Verify Core Values were inserted correctly

-- 1. Check if business blueprint exists
SELECT 
    bb.id as blueprint_id,
    bb.organization_id,
    bb.team_id,
    bb.name,
    o.name as org_name,
    t.name as team_name
FROM business_blueprints bb
JOIN organizations o ON bb.organization_id = o.id
LEFT JOIN teams t ON bb.team_id = t.id
WHERE o.slug = 'boyum-barenscheer';

-- 2. Check core values
SELECT 
    cv.*,
    bb.name as blueprint_name,
    o.name as org_name
FROM core_values cv
JOIN business_blueprints bb ON cv.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY cv.sort_order;

-- 3. Check if there are any other business blueprints
SELECT COUNT(*) as total_blueprints FROM business_blueprints;

-- 4. Check team_id values to ensure Leadership Team exists
SELECT id, name, organization_id 
FROM teams 
WHERE id = '00000000-0000-0000-0000-000000000000'
AND organization_id IN (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer');