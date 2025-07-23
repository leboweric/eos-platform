-- Check what teams exist for Skykit
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.type as team_type,
    t.is_department,
    t.parent_team_id,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY t.is_department, t.name;

-- Check if metrics are associated with specific teams
SELECT 
    sm.name as metric_name,
    sm.team_id,
    t.name as team_name,
    sm.created_at
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY sm.name;