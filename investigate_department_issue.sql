-- Check department structure and team assignments

-- 1. Check if Leadership Team has a department
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.organization_id
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.name = 'Leadership Team';

-- 2. Show all departments in Skykit
SELECT 
    d.id as dept_id,
    d.name as dept_name,
    COUNT(t.id) as team_count
FROM departments d
LEFT JOIN teams t ON d.id = t.department_id
WHERE d.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY d.id, d.name;

-- 3. Show all teams and their departments
SELECT 
    t.name as team_name,
    d.name as department_name,
    t.department_id,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY t.id, t.name, d.name, t.department_id
ORDER BY member_count DESC;

-- 4. SOLUTION: Remove Mike from Leadership Team so he sees everything like Irfan
/*
DELETE FROM team_members
WHERE user_id = (SELECT id FROM users WHERE email = 'mike.majerus@skykit.com')
  AND team_id = '47d53797-be5f-49c2-883a-326a401a17c1';
*/

-- 5. Alternative SOLUTION: Add Irfan to Leadership Team so both have same setup
/*
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    '47d53797-be5f-49c2-883a-326a401a17c1',  -- Leadership Team ID
    u.id,
    'member',
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'irfan.khan@skykit.com';
*/