-- Assign the Skykit Leadership department to Leadership Team
UPDATE teams
SET department_id = '0a45c91c-4511-4525-b62a-4a4b7e19a03d'
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';

-- Verify the update worked
SELECT 
    t.name as team_name,
    d.name as department_name,
    t.department_id,
    COUNT(tm.user_id) as member_count,
    STRING_AGG(u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name) as members
FROM teams t
JOIN departments d ON t.department_id = d.id
JOIN team_members tm ON t.id = tm.team_id
JOIN users u ON tm.user_id = u.id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1'
GROUP BY t.name, d.name, t.department_id;