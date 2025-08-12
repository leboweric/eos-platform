-- Remove all Aug 4, 2025 data for Boyum Barenscheer
-- That column should be empty as it's a future date

DO $$
DECLARE
  v_org_id UUID;
  v_count INTEGER;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  RAISE NOTICE 'Organization ID: %', v_org_id;

  -- Delete all scores for Aug 4, 2025 for this organization
  DELETE FROM scorecard_scores 
  WHERE week_date = '2025-08-04'
    AND metric_id IN (
      SELECT id FROM scorecard_metrics 
      WHERE organization_id = v_org_id 
        AND team_id = '00000000-0000-0000-0000-000000000000'
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Removed % score entries for Aug 4, 2025', v_count;

  RAISE NOTICE 'Aug 4 data removal complete!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify what weeks now have data
SELECT 
  to_char(ss.week_date, 'Mon DD') as week,
  COUNT(DISTINCT ss.metric_id) as metrics_with_data
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;

-- Show sample of data for verification (first 3 metrics)
SELECT 
  sm.name,
  MAX(CASE WHEN ss.week_date = '2025-08-04' THEN ss.value END) as "Aug 04 (should be null)",
  MAX(CASE WHEN ss.week_date = '2025-07-28' THEN ss.value END) as "Jul 28",
  MAX(CASE WHEN ss.week_date = '2025-07-21' THEN ss.value END) as "Jul 21",
  MAX(CASE WHEN ss.week_date = '2025-07-14' THEN ss.value END) as "Jul 14"
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id 
  AND ss.week_date IN ('2025-08-04', '2025-07-28', '2025-07-21', '2025-07-14')
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.display_order
ORDER BY sm.display_order
LIMIT 5;