-- Find all the "lost" data created by admin@skykit.com

-- 1. Find all Quarterly Priorities in Skykit org (regardless of team)
SELECT 
    qp.id,
    qp.title,
    qp.quarter,
    qp.year,
    qp.team_id,
    t.name as current_team_name,
    t.department_id,
    d.name as current_department_name,
    qp.created_by,
    u.email as created_by_email
FROM quarterly_priorities qp
LEFT JOIN teams t ON qp.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN users u ON qp.created_by = u.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
ORDER BY qp.created_at DESC;

-- 2. Find all Scorecard Metrics in Skykit org
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.team_id,
    t.name as current_team_name,
    t.department_id,
    d.name as current_department_name,
    COUNT(ss.id) as score_count
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY sm.id, sm.name, sm.team_id, t.name, t.department_id, d.name
ORDER BY sm.created_at DESC;

-- 3. Count the data that needs to be reassigned
SELECT 
    'Quarterly Priorities' as data_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN qp.team_id != '47d53797-be5f-49c2-883a-326a401a17c1' THEN 1 END) as needs_reassignment
FROM quarterly_priorities qp
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
UNION ALL
SELECT 
    'Scorecard Metrics' as data_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN sm.team_id != '47d53797-be5f-49c2-883a-326a401a17c1' THEN 1 END) as needs_reassignment
FROM scorecard_metrics sm
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- 4. Find what team the data is currently assigned to
SELECT DISTINCT
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    COUNT(DISTINCT qp.id) as priority_count,
    COUNT(DISTINCT sm.id) as metric_count
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN quarterly_priorities qp ON t.id = qp.team_id AND qp.deleted_at IS NULL
LEFT JOIN scorecard_metrics sm ON t.id = sm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND (qp.id IS NOT NULL OR sm.id IS NOT NULL)
GROUP BY t.id, t.name, t.department_id, d.name;