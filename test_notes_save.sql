-- Test if we can save and retrieve notes

-- First, check if notes column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scorecard_scores' 
AND column_name = 'notes';

-- Get a sample metric to test with
SELECT id, name, organization_id, team_id 
FROM scorecard_metrics 
LIMIT 1;

-- Try to insert a test score with notes (you'll need to replace the metric_id)
-- INSERT INTO scorecard_scores (metric_id, week_date, value, notes)
-- VALUES ('<metric_id>', '2025-08-12', 100, 'Test note from SQL')
-- ON CONFLICT (metric_id, week_date)
-- DO UPDATE SET value = 100, notes = 'Test note from SQL - updated', updated_at = CURRENT_TIMESTAMP
-- RETURNING *;

-- Check if notes are being saved
SELECT 
  ss.id,
  ss.metric_id,
  sm.name as metric_name,
  ss.week_date,
  ss.value,
  ss.notes,
  ss.updated_at
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE ss.notes IS NOT NULL
ORDER BY ss.updated_at DESC
LIMIT 10;