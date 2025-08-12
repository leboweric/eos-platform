-- Check if there are any scorecard scores for Skykit metrics
SELECT 
    sm.name as metric_name,
    COUNT(ss.id) as score_count,
    MIN(ss.week_ending) as earliest_score,
    MAX(ss.week_ending) as latest_score,
    AVG(ss.value) as avg_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
GROUP BY sm.id, sm.name
ORDER BY sm.name;

-- Check the structure of scorecard_scores table to understand the columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scorecard_scores'
ORDER BY ordinal_position;

-- Check a specific metric's scores in detail (e.g., "Churned $")
SELECT 
    ss.*,
    sm.name as metric_name
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
  AND sm.name = 'Churned $'
ORDER BY ss.week_ending DESC
LIMIT 10;

-- Check if there are ANY scores in the system for Skykit
SELECT COUNT(*) as total_scores
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457';