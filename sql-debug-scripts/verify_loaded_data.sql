-- Verify the scorecard data that was loaded for Boyum Barenscheer
SELECT 
  sm.name,
  sm.goal,
  sm.value_type,
  COUNT(ss.id) as weeks_with_data,
  MIN(ss.week_date) as earliest_date,
  MAX(ss.week_date) as latest_date,
  ROUND(AVG(ss.value), 2) as avg_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.goal, sm.value_type, sm.display_order
ORDER BY sm.display_order;