-- First, let's see what we have
-- This will show us the current metric IDs and their names
SELECT 
  display_order,
  name,
  id
FROM scorecard_metrics
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY display_order;

-- Now let's check what metric each score is attached to
-- This will help us understand if the data is mapped to the wrong metrics
WITH metric_mapping AS (
  SELECT 
    sm.name as metric_name,
    sm.id as metric_id,
    sm.display_order
  FROM scorecard_metrics sm
  WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
    AND sm.team_id = '00000000-0000-0000-0000-000000000000'
)
SELECT 
  mm.display_order,
  mm.metric_name,
  COUNT(ss.id) as score_count,
  MIN(ss.value) as min_value,
  MAX(ss.value) as max_value,
  AVG(ss.value)::numeric(10,2) as avg_value
FROM metric_mapping mm
LEFT JOIN scorecard_scores ss ON mm.metric_id = ss.metric_id
GROUP BY mm.display_order, mm.metric_name, mm.metric_id
ORDER BY mm.display_order;

-- Let's check the actual values for week of Aug 4 to see if they match expectations
SELECT 
  sm.display_order,
  sm.name,
  ss.value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id AND ss.week_date = '2025-08-04'
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY sm.display_order;