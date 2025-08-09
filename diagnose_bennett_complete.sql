-- =====================================================
-- Complete Bennett Material Handling Diagnosis
-- =====================================================

-- 1. Check ALL teams for Bennett
SELECT 
    'ALL BENNETT TEAMS' as check_type,
    t.id,
    t.name,
    t.is_leadership_team,
    t.organization_id,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY t.id, t.name, t.is_leadership_team, t.organization_id
ORDER BY t.is_leadership_team DESC, t.name;

-- 2. Check who owns the special UUID now
SELECT 
    'SPECIAL UUID OWNER' as check_type,
    t.id,
    t.name,
    o.name as org_name,
    o.slug
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '00000000-0000-0000-0000-000000000000';

-- 3. Check Bennett's Quarterly Priorities
SELECT 
    'BENNETT PRIORITIES' as check_type,
    COUNT(*) as total_priorities,
    qp.quarter,
    qp.year,
    qp.team_id
FROM quarterly_priorities qp
WHERE qp.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY qp.quarter, qp.year, qp.team_id;

-- 4. Check Bennett's Issues
SELECT 
    'BENNETT ISSUES' as check_type,
    COUNT(*) as total_issues,
    i.team_id,
    i.status
FROM issues i
WHERE i.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY i.team_id, i.status;

-- 5. Check Bennett's Todos
SELECT 
    'BENNETT TODOS' as check_type,
    COUNT(*) as total_todos,
    t.team_id,
    t.status
FROM todos t
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY t.team_id, t.status;

-- 6. Check Bennett's Scorecard Metrics
SELECT 
    'BENNETT SCORECARD' as check_type,
    COUNT(*) as total_metrics,
    sm.team_id
FROM scorecard_metrics sm
WHERE sm.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY sm.team_id;

-- 7. Check what team IDs are being used for Bennett's data
SELECT DISTINCT
    'TEAM IDS IN USE' as check_type,
    team_id,
    'quarterly_priorities' as source_table
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION
SELECT DISTINCT
    'TEAM IDS IN USE' as check_type,
    team_id,
    'issues' as source_table
FROM issues
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION
SELECT DISTINCT
    'TEAM IDS IN USE' as check_type,
    team_id,
    'todos' as source_table
FROM todos
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
UNION
SELECT DISTINCT
    'TEAM IDS IN USE' as check_type,
    team_id,
    'scorecard_metrics' as source_table
FROM scorecard_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling');

-- 8. Check if Bennett users are properly assigned to teams
SELECT 
    'BENNETT USER TEAMS' as check_type,
    u.email,
    u.first_name,
    u.last_name,
    tm.team_id,
    t.name as team_name,
    t.is_leadership_team
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
ORDER BY u.email;