-- Create department and fix Leadership Team

-- 1. Create a department for Skykit
INSERT INTO departments (id, organization_id, name)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM organizations WHERE name = 'Skykit'),
    'Skykit Leadership'
)
RETURNING id, name;

-- 2. After running step 1, copy the department ID and use it here
-- Replace 'PASTE_DEPARTMENT_ID_HERE' with the actual ID from step 1
/*
UPDATE teams
SET department_id = 'PASTE_DEPARTMENT_ID_HERE'
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';
*/

-- 3. Alternative: Do it all in one query (run this instead of steps 1 & 2)
WITH new_dept AS (
    INSERT INTO departments (id, organization_id, name)
    VALUES (
        gen_random_uuid(),
        (SELECT id FROM organizations WHERE name = 'Skykit'),
        'Skykit Leadership'
    )
    RETURNING id
)
UPDATE teams
SET department_id = (SELECT id FROM new_dept)
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1'
RETURNING teams.name, department_id;

-- 4. Verify everything is fixed
SELECT 
    t.name as team_name,
    d.name as department_name,
    COUNT(tm.user_id) as member_count,
    STRING_AGG(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name) as members
FROM teams t
JOIN departments d ON t.department_id = d.id
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1'
GROUP BY t.name, d.name;