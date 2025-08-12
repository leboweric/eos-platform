-- Debug why Core Values aren't showing in UI

-- 1. Check what the API expects - are there multiple blueprints?
SELECT 
    bb.id,
    bb.organization_id,
    bb.team_id,
    bb.department_id,
    bb.name,
    bb.is_shared_with_all_teams,
    o.slug as org_slug,
    t.name as team_name
FROM business_blueprints bb
JOIN organizations o ON bb.organization_id = o.id
LEFT JOIN teams t ON bb.team_id = t.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY bb.created_at;

-- 2. Check if department_id is causing issues (should be NULL for Leadership Team)
SELECT 
    bb.id,
    bb.team_id,
    bb.department_id,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY bb.id, bb.team_id, bb.department_id;

-- 3. Maybe we need to use department_id instead of team_id?
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'business_blueprints'
ORDER BY ordinal_position;

-- 4. Check if there's a department_id for Leadership Team
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team,
    t.department_id
FROM teams t
WHERE t.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
AND t.id = '00000000-0000-0000-0000-000000000000';