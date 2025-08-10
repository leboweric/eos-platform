-- Check what data exists for Boyum Barenscheer
-- First check the org ID
SELECT id, name FROM organizations WHERE name = 'Boyum Barenscheer';

-- Check metrics
SELECT 
  sm.id,
  sm.name,
  sm.team_id,
  sm.type,
  sm.goal,
  sm.owner
FROM scorecard_metrics sm
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
LIMIT 5;

-- Check actual score data with exact dates
SELECT 
  sm.name as metric_name,
  ss.week_date::text as exact_date,
  ss.value
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
  AND ss.week_date >= '2025-06-01'
ORDER BY ss.week_date DESC, sm.name
LIMIT 20;

-- Check what team_ids exist for this org's metrics
SELECT DISTINCT team_id, COUNT(*) as metric_count
FROM scorecard_metrics
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY team_id;