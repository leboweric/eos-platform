-- Add all Skykit users to Leadership Team

-- 1. First, let's see who needs to be added (users without team membership)
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name as full_name,
    u.email,
    u.role,
    CASE 
        WHEN tm.team_id IS NULL THEN 'Needs to be added to Leadership Team'
        ELSE 'Already in team: ' || t.name
    END as status
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
ORDER BY status, full_name;

-- 2. Add all Skykit users who aren't already in a team to the Leadership Team
INSERT INTO team_members (id, team_id, user_id, role)
SELECT 
    gen_random_uuid(),
    '47d53797-be5f-49c2-883a-326a401a17c1',  -- Leadership Team ID
    u.id,
    CASE 
        WHEN u.role = 'admin' THEN 'admin'
        ELSE 'member'
    END
FROM users u
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.user_id = u.id
  );

-- 3. Verify everyone is now in the Leadership Team
SELECT 
    u.first_name || ' ' || u.last_name as full_name,
    u.email,
    u.role as user_role,
    tm.role as team_role,
    t.name as team_name
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
ORDER BY full_name;

-- 4. Count check - should show all users are now in teams
SELECT 
    COUNT(DISTINCT u.id) as total_skykit_users,
    COUNT(DISTINCT tm.user_id) as users_with_teams,
    COUNT(DISTINCT u.id) - COUNT(DISTINCT tm.user_id) as users_without_teams
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');