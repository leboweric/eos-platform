-- =====================================================
-- Diagnose why 2-Page Plan isn't showing for Bennett
-- =====================================================

-- 1. Check Bennett's Leadership Team setup
SELECT 
    o.name as org_name,
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team,
    CASE 
        WHEN t.id = '00000000-0000-0000-0000-000000000000' THEN 'SPECIAL UUID'
        ELSE 'REGULAR UUID'
    END as uuid_type
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id
WHERE o.slug = 'bennett-material-handling'
AND (t.is_leadership_team = true OR t.id = '00000000-0000-0000-0000-000000000000');

-- 2. Check Bennett's blueprint configuration
SELECT 
    o.name as org_name,
    bb.id as blueprint_id,
    bb.team_id,
    bb.is_shared_with_all_teams,
    bb.name as blueprint_name,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (CORRECT)'
        WHEN bb.team_id = '00000000-0000-0000-0000-000000000000' THEN 'LEADERSHIP TEAM (WRONG)'
        ELSE 'OTHER TEAM (WRONG)'
    END as config_status
FROM organizations o
JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE o.slug = 'bennett-material-handling';

-- 3. Check if Bennett has the Leadership Team with correct UUID
SELECT 
    'Leadership Team Check' as check_type,
    COUNT(*) as has_leadership_team
FROM teams
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND id = '00000000-0000-0000-0000-000000000000';

-- 4. Check all Bennett's teams
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY t.id, t.name, t.is_leadership_team
ORDER BY t.is_leadership_team DESC, t.name;