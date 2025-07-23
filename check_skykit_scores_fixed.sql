-- Check if there are any scorecard scores for Skykit metrics
SELECT 
    sm.name as metric_name,
    COUNT(ss.id) as score_count,
    MIN(ss.week_date) as earliest_score,
    MAX(ss.week_date) as latest_score,
    AVG(ss.value) as avg_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
GROUP BY sm.id, sm.name
ORDER BY sm.name;

-- Check a specific metric's scores in detail (e.g., "Churned $")
SELECT 
    ss.id,
    ss.week_date,
    ss.value,
    ss.created_at,
    sm.name as metric_name
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
  AND sm.name = 'Churned $'
ORDER BY ss.week_date DESC
LIMIT 10;

-- Check if there are ANY scores in the system for Skykit
SELECT COUNT(*) as total_scores
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457';

-- Also check teams for Skykit (from the previous file)
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.is_department,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY t.is_department, t.name;