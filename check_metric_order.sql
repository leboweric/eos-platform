-- Check the current metric order and IDs
SELECT 
  sm.display_order,
  sm.name,
  sm.id,
  sm.goal,
  sm.owner
FROM scorecard_metrics sm
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY sm.display_order, sm.created_at;

-- Check a sample of scores to see what metric they're attached to
SELECT 
  sm.name as metric_name,
  ss.week_date::date,
  ss.value
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
  AND ss.week_date = '2025-08-04'
ORDER BY sm.display_order;