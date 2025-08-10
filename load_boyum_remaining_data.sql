-- Load remaining Boyum scorecard data
-- This loads data for metrics that weren't in the first script

DO $$
DECLARE
  v_org_id UUID;
  v_metric_id UUID;
  v_count INTEGER;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  
  -- Active Production - AA
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - AA';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Active Production - AA: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 63.25),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 98),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 76),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 53),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 26)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Active Production - AA', v_count;
  END IF;

  -- Active Production - BAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - BAS';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Active Production - BAS: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 67.75),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 101),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 84),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 56),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 30)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Active Production - BAS', v_count;
  END IF;

  -- Active Production - CAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - CAS';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Active Production - CAS: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 87),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 124),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 101),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 77),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 46)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Active Production - CAS', v_count;
  END IF;

  -- Active Production - Tax
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - Tax';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Active Production - Tax: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 73.25),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 110),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 87),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 62),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 34)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Active Production - Tax', v_count;
  END IF;

  -- Active Production Goal
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production Goal';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Active Production Goal: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 69.75),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 105),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 84),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 31)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Active Production Goal', v_count;
  END IF;

  -- Billing Goal
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Billing Goal';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Billing Goal: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 34.19),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 50),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 27.3),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 42.1),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 29.4),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 21.4),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 0),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 72.4),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 84.8)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Billing Goal', v_count;
  END IF;

  -- Total Adjustments for Billing < 60% Realization
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Total Adjustments for Billing < 60% Realization';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Total Adjustments: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', -30530.2),
    (gen_random_uuid(), v_metric_id, '2025-07-03', -17157.25),
    (gen_random_uuid(), v_metric_id, '2025-07-21', -35428.38),
    (gen_random_uuid(), v_metric_id, '2025-07-14', -41697.1),
    (gen_random_uuid(), v_metric_id, '2025-07-20', -75062.08),
    (gen_random_uuid(), v_metric_id, '2025-07-07', -19186.13),
    (gen_random_uuid(), v_metric_id, '2025-07-13', -19886.25),
    (gen_random_uuid(), v_metric_id, '2025-06-30', -36538.78),
    (gen_random_uuid(), v_metric_id, '2025-06-06', -9547.29),
    (gen_random_uuid(), v_metric_id, '2025-06-23', -15960),
    (gen_random_uuid(), v_metric_id, '2025-05-25', -34928.75)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Total Adjustments', v_count;
  END IF;

  -- Utilization - BAS/CAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - BAS/CAS';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Utilization - BAS/CAS: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 56.82),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 49),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 61),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 69),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 44),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 61),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 33),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 69),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 61),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 43),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 76)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Utilization - BAS/CAS', v_count;
  END IF;

  -- Utilization - Tax
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - Tax';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Utilization - Tax: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 48.36),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 55),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 50),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 48),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 54),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 35),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 29),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 54),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 53),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 47),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 64)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Utilization - Tax', v_count;
  END IF;

  RAISE NOTICE 'Data loading complete!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify what was loaded
SELECT 
  sm.name,
  COUNT(ss.id) as weeks_with_data,
  MIN(ss.week_date)::text as earliest_date,
  MAX(ss.week_date)::text as latest_date,
  ROUND(AVG(ss.value), 2) as avg_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.display_order
ORDER BY sm.display_order;