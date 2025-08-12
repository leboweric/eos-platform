-- Step 1: Check Mike's current status
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.organization_id,
    tm.team_id,
    tm.role as team_role,
    t.name as team_name,
    CASE 
        WHEN tm.team_id IS NULL THEN 'NO TEAM ASSIGNED - THIS IS THE PROBLEM!'
        ELSE 'Has team'
    END as status
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%';

-- Step 2: Find the main Skykit team to add Mike to
SELECT 
    t.id as team_id,
    t.name as team_name,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY t.id, t.name
ORDER BY member_count DESC;

-- Step 3: After identifying the team ID from Step 2, run this to add Mike
-- Replace 'TEAM_ID_HERE' with the actual team ID from Step 2
/*
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'TEAM_ID_HERE',  -- <-- REPLACE THIS with team ID from Step 2
    u.id,
    'member',
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%';
*/