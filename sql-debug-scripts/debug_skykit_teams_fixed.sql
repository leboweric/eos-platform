-- Check ALL teams for Skykit organization
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.parent_team_id
FROM teams t
WHERE t.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY t.name;

-- Check if the departments endpoint is returning this team
SELECT 
    t.id,
    t.name,
    t.organization_id,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
   AND t.name = 'Leadership Team';

-- Verify the scorecard metrics are using the correct team_id
SELECT DISTINCT
    sm.team_id,
    t.name as team_name,
    COUNT(*) as metric_count
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
GROUP BY sm.team_id, t.name;