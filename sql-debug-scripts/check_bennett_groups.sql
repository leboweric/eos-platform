-- =====================================================
-- Check Bennett's Scorecard Groups
-- =====================================================

-- 1. Check if Bennett has any scorecard groups
SELECT 
    'Bennett Groups' as check_type,
    sg.id,
    sg.name,
    sg.team_id,
    t.name as team_name,
    sg.type,
    sg.display_order
FROM scorecard_groups sg
LEFT JOIN teams t ON sg.team_id = t.id
WHERE sg.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
ORDER BY sg.display_order;

-- 2. Check what team IDs are being used for groups
SELECT 
    'Groups by Team' as check_type,
    sg.team_id,
    t.name as team_name,
    COUNT(*) as group_count
FROM scorecard_groups sg
LEFT JOIN teams t ON sg.team_id = t.id  
WHERE sg.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY sg.team_id, t.name;

-- 3. Check if any groups are orphaned (wrong team)
SELECT 
    'Orphaned Groups' as check_type,
    sg.id,
    sg.name,
    sg.team_id,
    CASE 
        WHEN t.id IS NULL THEN 'Team does not exist'
        WHEN t.organization_id != sg.organization_id THEN 'Team belongs to different org'
        ELSE 'OK'
    END as issue
FROM scorecard_groups sg
LEFT JOIN teams t ON sg.team_id = t.id
WHERE sg.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND (t.id IS NULL OR t.organization_id != sg.organization_id);

-- 4. Bennett's current Leadership Team ID for reference
SELECT 
    'Bennett Leadership Team' as reference,
    id as team_id,
    name,
    is_leadership_team
FROM teams
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND is_leadership_team = true;