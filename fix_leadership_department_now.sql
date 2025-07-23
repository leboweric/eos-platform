-- Fix Leadership Team by assigning it to a department

-- 1. Show existing departments in Skykit
SELECT 
    d.id as department_id,
    d.name as department_name,
    COUNT(t.id) as teams_in_dept
FROM departments d
LEFT JOIN teams t ON d.id = t.department_id
WHERE d.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY d.id, d.name
ORDER BY d.name;

-- 2. If no departments exist, create one
-- Uncomment and run if needed:
/*
INSERT INTO departments (id, organization_id, name)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM organizations WHERE name = 'Skykit'),
    'Skykit Leadership'
);
*/

-- 3. Update Leadership Team to have a department
-- Replace 'DEPARTMENT_ID_HERE' with the department ID from step 1 or 2
/*
UPDATE teams
SET department_id = 'DEPARTMENT_ID_HERE'
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';
*/

-- 4. Verify the fix
/*
SELECT 
    t.name as team_name,
    d.name as department_name,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1'
GROUP BY t.name, d.name;
*/