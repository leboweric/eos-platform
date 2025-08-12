-- Check if Leadership Team has a department assignment
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    CASE 
        WHEN t.department_id IS NULL THEN 'NO DEPARTMENT - This might be the issue!'
        ELSE 'Has department'
    END as status
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1';