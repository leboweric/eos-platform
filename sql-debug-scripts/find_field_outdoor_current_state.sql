-- Find Field Outdoor Spaces current state

-- 1. Find the organization (maybe name or ID changed?)
SELECT 
    id,
    name,
    slug,
    created_at
FROM organizations 
WHERE name LIKE '%Field%'
   OR name LIKE '%Outdoor%'
   OR id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 2. Check all organizations that have exactly 2 blueprints (1 org, 1 team)
SELECT 
    o.id as org_id,
    o.name as org_name,
    COUNT(DISTINCT bb.id) as total_blueprints,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) as org_level,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) as team_level,
    STRING_AGG(DISTINCT t.name, ', ') as team_names,
    STRING_AGG(DISTINCT 
        CASE 
            WHEN t.is_leadership_team THEN t.name || ' (Leadership)'
            WHEN t.name IS NULL AND bb.team_id IS NOT NULL THEN 'ORPHANED BLUEPRINT - Team ID: ' || bb.team_id
            ELSE t.name || ' (Department)'
        END, ', '
    ) as team_details
FROM organizations o
JOIN business_blueprints bb ON bb.organization_id = o.id
LEFT JOIN teams t ON t.id = bb.team_id
GROUP BY o.id, o.name
HAVING COUNT(DISTINCT bb.id) = 2
   AND COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) = 1
   AND COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) = 1
ORDER BY o.name;

-- 3. Specifically check Field Outdoor Spaces blueprints again
SELECT 
    'Blueprint check:' as check,
    bb.id,
    bb.organization_id,
    bb.team_id,
    bb.created_at,
    o.name as org_name,
    t.name as team_name
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
LEFT JOIN teams t ON t.id = bb.team_id
WHERE o.name LIKE '%Field Outdoor%';

-- 4. Check if the team IDs we've been working with exist
SELECT 
    'Team existence check:' as check,
    'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' as team_id_checking,
    EXISTS(SELECT 1 FROM teams WHERE id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626') as exists_in_teams,
    EXISTS(SELECT 1 FROM business_blueprints WHERE team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626') as has_blueprint;