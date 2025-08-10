-- Show ALL scorecard data for Boyum Barenscheer
-- This will show every data point that exists

-- First, show summary by metric
SELECT 
  sm.name as metric_name,
  COUNT(ss.id) as data_points,
  MIN(ss.week_date)::text as first_week,
  MAX(ss.week_date)::text as last_week,
  STRING_AGG(DISTINCT to_char(ss.week_date, 'MM/DD'), ', ' ORDER BY to_char(ss.week_date, 'MM/DD')) as all_dates
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.display_order
ORDER BY sm.display_order;

-- Now show the actual data for a few key metrics
SELECT 
  sm.name as metric,
  to_char(ss.week_date, 'YYYY-MM-DD Day') as week,
  ss.value
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
  AND sm.name IN ('Revenue Per FTE', 'Cash Balance', 'YTD Billing Realization')
ORDER BY sm.name, ss.week_date DESC
LIMIT 100;