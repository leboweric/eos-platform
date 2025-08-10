-- Final fix for Boyum Barenscheer scorecard data
-- This will correctly map the Rainmaker $ Added data to the right metric

DO $$
DECLARE
  v_org_id UUID;
  v_metric_id UUID;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  RAISE NOTICE 'Organization ID: %', v_org_id;

  -- Fix the two metrics that are confused:
  -- 1. "Rainmaker $ Added" should have the big dollar values from row 1
  -- 2. "Revenue Per FTE" should have the smaller per-FTE values from row 17

  -- First, clear data for these two metrics
  DELETE FROM scorecard_scores 
  WHERE metric_id IN (
    SELECT id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000'
      AND name IN ('Rainmaker $ Added', 'Revenue Per FTE')
  );
  RAISE NOTICE 'Cleared data for Rainmaker $ Added and Revenue Per FTE';

  -- Load Rainmaker $ Added (Row 1 from spreadsheet - the big values)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Rainmaker $ Added';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 55020),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 67700),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 58200),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 10750),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 51250),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 87200),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 0),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 0),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 3200),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 0)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Rainmaker $ Added data with ID: %', v_metric_id;
  ELSE
    RAISE NOTICE 'WARNING: Rainmaker $ Added metric not found!';
  END IF;

  -- Load Revenue Per FTE (Row 17 from spreadsheet - the smaller per-FTE values)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Revenue Per FTE';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 2780.21),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 3251.49),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 3263.65),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 3218.29),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 2946.59),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 1581.25),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 2618.47),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 1024.36),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 2998.2),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 2955.24),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 2603.75),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 3321.03)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Revenue Per FTE data with ID: %', v_metric_id;
  ELSE
    RAISE NOTICE 'WARNING: Revenue Per FTE metric not found!';
  END IF;

  RAISE NOTICE 'Data fix complete!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify the fix
SELECT 
  sm.display_order,
  sm.name,
  sm.goal,
  ss_aug4.value as aug_4,
  ss_jul28.value as jul_28,
  ss_jul21.value as jul_21
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss_aug4 ON sm.id = ss_aug4.metric_id AND ss_aug4.week_date = '2025-08-04'
LEFT JOIN scorecard_scores ss_jul28 ON sm.id = ss_jul28.metric_id AND ss_jul28.week_date = '2025-07-28'
LEFT JOIN scorecard_scores ss_jul21 ON sm.id = ss_jul21.metric_id AND ss_jul21.week_date = '2025-07-21'
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
  AND sm.name IN ('Rainmaker $ Added', 'Revenue Per FTE', 'YTD Billing Realization')
ORDER BY sm.display_order;