-- =====================================================
-- Verify Bennett is Completely Fixed
-- =====================================================

-- 1. Check Bennett's Leadership Team now has members
SELECT 
    'Bennett Leadership Members' as check_type,
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND t.is_leadership_team = true
GROUP BY t.id, t.name, t.is_leadership_team;

-- 2. List who's on Bennett's Leadership Team
SELECT 
    'Bennett Leadership Users' as check_type,
    u.email,
    u.first_name,
    u.last_name,
    t.name as team_name
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND t.is_leadership_team = true
ORDER BY u.email;

-- 3. Verify no Bennett users are still on Boyum's team
SELECT 
    'Bennett Users on Wrong Team' as check_type,
    u.email,
    u.first_name,
    u.last_name,
    o.name as team_org_name
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
JOIN organizations o ON t.organization_id = o.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND t.organization_id != u.organization_id;

-- 4. Confirm Bennett's blueprint still has data
SELECT 
    'Bennett Blueprint Data' as check_type,
    bb.id as blueprint_id,
    bb.team_id,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = bb.id) as core_values,
    (SELECT COUNT(*) FROM core_focus WHERE vto_id = bb.id) as core_focus,
    (SELECT COUNT(*) FROM three_year_pictures WHERE vto_id = bb.id) as three_year
FROM business_blueprints bb
WHERE bb.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND bb.team_id IS NULL;

-- 5. Summary of all Bennett data
SELECT 
    'Data Summary' as check_type,
    'Issues' as data_type,
    COUNT(*) as total,
    COUNT(CASE WHEN team_id = '559822f8-c442-48dd-91dc-d23dff10959f' THEN 1 END) as on_leadership_team
FROM issues
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION ALL
SELECT 
    'Data Summary',
    'Todos',
    COUNT(*),
    COUNT(CASE WHEN team_id = '559822f8-c442-48dd-91dc-d23dff10959f' THEN 1 END)
FROM todos
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION ALL
SELECT 
    'Data Summary',
    'Priorities',
    COUNT(*),
    COUNT(CASE WHEN team_id = '559822f8-c442-48dd-91dc-d23dff10959f' THEN 1 END)
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION ALL
SELECT 
    'Data Summary',
    'Scorecard',
    COUNT(*),
    COUNT(CASE WHEN team_id = '559822f8-c442-48dd-91dc-d23dff10959f' THEN 1 END)
FROM scorecard_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling');