-- Check what teams exist for Skykit
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.is_department
FROM teams t
WHERE t.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY t.is_department DESC, t.name;

-- Check if metrics have team_id associations
SELECT 
    sm.id as metric_id,
    sm.name as metric_name,
    sm.team_id,
    t.name as team_name,
    t.is_department
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY sm.name;