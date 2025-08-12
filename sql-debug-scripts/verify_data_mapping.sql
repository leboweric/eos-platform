-- Check what data is actually mapped to which metric
-- This will show us if the data is in the right metric rows

-- For Aug 4, 2025 - let's see what values are mapped to what metrics
SELECT 
  sm.display_order,
  sm.name as metric_name,
  sm.goal,
  ss.value as aug_4_value,
  CASE 
    WHEN sm.name = 'Revenue Per FTE' AND ss.value = 35329 THEN '✓ CORRECT'
    WHEN sm.name = 'YTD Billing Realization' AND ss.value = 96.3 THEN '✓ CORRECT'
    WHEN sm.name = 'Cash Balance' AND ss.value = 2597974.1 THEN '✓ CORRECT'
    WHEN sm.name = 'Utilization - A&A' AND ss.value = 57.18 THEN '✓ CORRECT'
    WHEN sm.name = 'Utilization - BAS' AND ss.value = 45.82 THEN '✓ CORRECT'
    WHEN sm.name = 'Utilization - Total' AND ss.value = 51.27 THEN '✓ CORRECT'
    WHEN ss.value IS NULL THEN 'NO DATA'
    ELSE '✗ WRONG DATA'
  END as data_check
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id AND ss.week_date = '2025-08-04'
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY sm.display_order;

-- Let's also check the metric IDs to understand the mapping
SELECT 
  'Metric mapping check:' as check_type,
  sm.name,
  sm.id,
  COUNT(ss.id) as score_count
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.id
ORDER BY sm.name;