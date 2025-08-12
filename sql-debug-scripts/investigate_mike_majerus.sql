-- Investigation queries for Mike Majerus access issues

-- 1. Find Mike's user record and basic info
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.organization_id,
    u.created_at,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');

-- 2. Check Mike's team memberships
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    tm.team_id,
    tm.role as team_role,
    t.name as team_name,
    t.department_id,
    d.name as department_name
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');

-- 3. Compare Mike's setup with another working user (you'll need to replace with a working user's email)
-- Replace 'working.user@skykit.com' with an actual working user's email
SELECT 
    'Working User' as user_type,
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    tm.team_id,
    tm.role as team_role,
    t.name as team_name,
    t.department_id
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'working.user@skykit.com' -- REPLACE THIS
UNION ALL
SELECT 
    'Mike Majerus' as user_type,
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    tm.team_id,
    tm.role as team_role,
    t.name as team_name,
    t.department_id
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');

-- 4. Check if Mike has any quarterly priorities assigned
SELECT 
    u.first_name,
    u.last_name,
    COUNT(qp.id) as priority_count,
    STRING_AGG(qp.title, ', ') as priorities
FROM users u
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus')
GROUP BY u.id, u.first_name, u.last_name;

-- 5. Check what organization and teams Mike can access based on the queries used in the app
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.organization_id,
    tm.team_id,
    t.department_id,
    CASE 
        WHEN tm.team_id IS NULL THEN 'NO TEAM MEMBERSHIP'
        ELSE 'HAS TEAM MEMBERSHIP'
    END as membership_status
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');

-- 6. Check if there are any issues or todos visible to Mike's teams
SELECT 
    'Issues' as item_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN i.team_id = tm.team_id THEN 1 END) as team_specific_count,
    COUNT(CASE WHEN i.team_id IS NULL THEN 1 END) as org_wide_count
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN issues i ON i.organization_id = u.organization_id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus')
GROUP BY u.id;