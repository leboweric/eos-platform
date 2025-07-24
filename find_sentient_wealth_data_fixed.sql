-- Find where the Sentient Wealth data is located (with correct column names)
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755

-- 1. Show ALL teams in Sentient Wealth (including their department assignments)
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    t.is_leadership_team
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.name;

-- 2. Find all Scorecard Metrics in Sentient Wealth (across all teams)
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.team_id,
    t.name as team_name,
    d.name as department_name
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.name, sm.name;

-- 3. Find all Quarterly Priorities in Sentient Wealth
SELECT 
    qp.id,
    qp.priority_text,
    qp.team_id,
    t.name as team_name,
    d.name as department_name
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.name, qp.priority_text;

-- 4. Find all Issues in Sentient Wealth
SELECT 
    i.id,
    i.issue_name,
    i.team_id,
    t.name as team_name,
    d.name as department_name
FROM issues i
JOIN teams t ON i.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.name, i.issue_name;

-- 5. Find all To-Dos in Sentient Wealth
SELECT 
    td.id,
    td.description,
    td.team_id,
    t.name as team_name,
    d.name as department_name
FROM todos td
JOIN teams t ON td.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
ORDER BY t.name, td.description;

-- 6. Check if there's data assigned directly to the organization (not through teams)
-- This might happen if team_id is NULL or doesn't match existing teams
SELECT 
    'Scorecard Metrics with no valid team' as issue_type,
    COUNT(*) as count
FROM scorecard_metrics sm
WHERE sm.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (sm.team_id IS NULL OR sm.team_id NOT IN (
    SELECT id FROM teams WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  ))

UNION ALL

SELECT 
    'Priorities with no valid team' as issue_type,
    COUNT(*) as count
FROM quarterly_priorities qp
WHERE qp.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (qp.team_id IS NULL OR qp.team_id NOT IN (
    SELECT id FROM teams WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  ))

UNION ALL

SELECT 
    'Issues with no valid team' as issue_type,
    COUNT(*) as count
FROM issues i
WHERE i.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (i.team_id IS NULL OR i.team_id NOT IN (
    SELECT id FROM teams WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  ))

UNION ALL

SELECT 
    'To-Dos with no valid team' as issue_type,
    COUNT(*) as count
FROM todos td
WHERE td.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (td.team_id IS NULL OR td.team_id NOT IN (
    SELECT id FROM teams WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  ));

-- 7. Summary count by team (only teams with data)
SELECT 
    t.name as team_name,
    d.name as department_name,
    (SELECT COUNT(*) FROM scorecard_metrics WHERE team_id = t.id) as scorecard_count,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE team_id = t.id) as priority_count,
    (SELECT COUNT(*) FROM issues WHERE team_id = t.id) as issue_count,
    (SELECT COUNT(*) FROM todos WHERE team_id = t.id) as todo_count
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
WHERE t.organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755'
  AND (
    EXISTS (SELECT 1 FROM scorecard_metrics WHERE team_id = t.id) OR
    EXISTS (SELECT 1 FROM quarterly_priorities WHERE team_id = t.id) OR
    EXISTS (SELECT 1 FROM issues WHERE team_id = t.id) OR
    EXISTS (SELECT 1 FROM todos WHERE team_id = t.id)
  )
ORDER BY t.name;