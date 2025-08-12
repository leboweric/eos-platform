-- Add Mike Majerus to the Leadership Team
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '47d53797-be5f-49c2-883a-326a401a17c1',  -- Leadership Team ID
    u.id,
    'member',
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%';

-- Verify the fix worked
SELECT 
    u.first_name || ' ' || u.last_name as name,
    u.email,
    t.name as team_name,
    tm.role as team_role,
    tm.created_at
FROM users u
JOIN team_members tm ON u.id = tm.user_id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'mike@skykit.com' OR u.email LIKE '%majerus%';