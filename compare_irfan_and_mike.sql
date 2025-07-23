-- Compare Irfan Khan (working) with Mike Majerus (not working)

-- 1. Basic user info comparison
SELECT 
    'Irfan Khan' as user_name,
    u.id,
    u.email,
    u.role,
    u.organization_id,
    o.name as org_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email LIKE '%irfan%' OR (u.first_name = 'Irfan' AND u.last_name = 'Khan')
UNION ALL
SELECT 
    'Mike Majerus' as user_name,
    u.id,
    u.email,
    u.role,
    u.organization_id,
    o.name as org_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%';

-- 2. Team membership comparison
SELECT 
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    tm.team_id,
    t.name as team_name,
    tm.role as team_role,
    t.department_id,
    d.name as department_name,
    CASE 
        WHEN tm.team_id IS NULL THEN 'NO TEAM'
        ELSE 'HAS TEAM'
    END as team_status
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE u.email LIKE '%irfan%' OR (u.first_name = 'Irfan' AND u.last_name = 'Khan')
   OR u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%'
ORDER BY user_name;

-- 3. Show all teams that Irfan is a member of
SELECT 
    'Teams Irfan is in:' as info,
    t.id as team_id,
    t.name as team_name,
    tm.role as member_role,
    d.name as department_name
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE u.email LIKE '%irfan%' OR (u.first_name = 'Irfan' AND u.last_name = 'Khan');

-- 4. Count how many users can see data (have team assignments) vs Mike
SELECT 
    COUNT(DISTINCT u.id) as users_with_teams,
    COUNT(DISTINCT CASE WHEN u.email LIKE '%majerus%' THEN u.id END) as mike_with_team
FROM users u
JOIN team_members tm ON u.id = tm.user_id
WHERE u.organization_id = (SELECT organization_id FROM users WHERE email = 'mike@skykit.com' OR email LIKE '%majerus%');