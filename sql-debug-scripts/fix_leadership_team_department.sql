-- Fix Leadership Team to have proper department association

-- 1. Check current Leadership Team setup
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1';

-- 2. Find or create a Leadership department
-- First check if one exists
SELECT * FROM departments 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND (name LIKE '%Leadership%' OR name LIKE '%Executive%' OR name LIKE '%All%');

-- 3. If no Leadership department exists, create one
/*
INSERT INTO departments (id, organization_id, name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM organizations WHERE name = 'Skykit'),
    'Leadership',
    NOW(),
    NOW()
);
*/

-- 4. Update Leadership Team to have the Leadership department
-- Replace 'DEPARTMENT_ID' with the actual department ID from step 2 or 3
/*
UPDATE teams
SET department_id = 'DEPARTMENT_ID'
WHERE id = '47d53797-be5f-49c2-883a-326a401a17c1';
*/

-- 5. Alternative: Find the main department that has data and assign Leadership Team to it
SELECT 
    d.id as dept_id,
    d.name as dept_name,
    COUNT(DISTINCT qp.id) as priority_count,
    COUNT(DISTINCT s.id) as scorecard_metric_count,
    COUNT(DISTINCT i.id) as issue_count
FROM departments d
LEFT JOIN quarterly_priorities qp ON d.id = (
    SELECT t.department_id FROM teams t WHERE t.id = qp.team_id
)
LEFT JOIN scorecard_metrics s ON d.id = (
    SELECT t.department_id FROM teams t WHERE t.id = s.team_id
)
LEFT JOIN issues i ON d.organization_id = i.organization_id
WHERE d.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY d.id, d.name
ORDER BY priority_count + scorecard_metric_count + issue_count DESC;