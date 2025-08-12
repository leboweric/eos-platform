-- Check if there are any scorecard entries for Skykit metrics
SELECT 
    sm.name as metric_name,
    COUNT(se.id) as entry_count,
    MIN(se.date) as earliest_entry,
    MAX(se.date) as latest_entry,
    AVG(se.value) as avg_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_entries se ON sm.id = se.metric_id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
GROUP BY sm.id, sm.name
ORDER BY sm.name;

-- Check a specific metric's entries in detail (e.g., "Churned $")
SELECT 
    se.date,
    se.value,
    se.created_at,
    sm.name as metric_name
FROM scorecard_entries se
JOIN scorecard_metrics sm ON se.metric_id = sm.id
WHERE sm.organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
  AND sm.name = 'Churned $'
ORDER BY se.date DESC
LIMIT 10;