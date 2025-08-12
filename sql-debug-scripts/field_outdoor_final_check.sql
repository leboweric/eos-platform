-- Final check of Field Outdoor Spaces current state

-- 1. Get their team(s)
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    t.organization_id,
    o.name as org_name
FROM teams t
JOIN organizations o ON o.id = t.organization_id
WHERE o.name = 'Field Outdoor Spaces';

-- 2. Get their blueprint(s)
SELECT 
    bb.id as blueprint_id,
    bb.organization_id,
    bb.team_id,
    o.name as org_name,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (correct for Leadership)'
        ELSE 'TEAM-LEVEL for team: ' || bb.team_id
    END as blueprint_type
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';

-- 3. Count summary
SELECT 
    o.name as org_name,
    (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id) as total_teams,
    (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id AND t.is_leadership_team = true) as leadership_teams,
    (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id AND t.is_leadership_team = false) as department_teams,
    (SELECT COUNT(*) FROM business_blueprints bb WHERE bb.organization_id = o.id) as total_blueprints,
    (SELECT COUNT(*) FROM business_blueprints bb WHERE bb.organization_id = o.id AND bb.team_id IS NULL) as org_level_blueprints,
    (SELECT COUNT(*) FROM business_blueprints bb WHERE bb.organization_id = o.id AND bb.team_id IS NOT NULL) as team_level_blueprints
FROM organizations o
WHERE o.name = 'Field Outdoor Spaces';