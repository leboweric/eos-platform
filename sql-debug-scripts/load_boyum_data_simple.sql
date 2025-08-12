-- Simple script to load Boyum scorecard data
-- Run this AFTER the metrics have been created

-- First, let's verify we have the right org and metrics
SELECT 'Organization ID:', id FROM organizations WHERE name = 'Boyum Barenscheer';

SELECT 'Metrics found:', COUNT(*) 
FROM scorecard_metrics 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND team_id = '00000000-0000-0000-0000-000000000000';

-- Now insert data for each metric one at a time
DO $$
DECLARE
  v_org_id UUID;
  v_metric_id UUID;
  v_count INTEGER;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  
  -- Revenue Per FTE / Rainmaker $ Added data
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Revenue Per FTE';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Revenue Per FTE: %', v_metric_id;
    
    -- Insert only non-null values
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 35329.00),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 67768.00),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 38208.00),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 18750.00),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 51256.00),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 87200.00)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Revenue Per FTE', v_count;
  ELSE
    RAISE NOTICE 'Revenue Per FTE metric not found';
  END IF;

  -- YTD Billing Realization
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'YTD Billing Realization';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for YTD Billing Realization: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 96.3),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 95.01),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 95.29),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 95.44),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 95.64),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 95.5),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 96.71),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 96.85),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 97.14),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 97.25),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 97.03),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 97.45)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for YTD Billing Realization', v_count;
  END IF;

  -- Cash Balance
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Cash Balance';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Cash Balance: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 2597974.1),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 2632804.35),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 2550405.1),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 2299011.29),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 2624924.84),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 2554802.03),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 2625221.09),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 2560521.2),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 2982712.58),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 2629209.31),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 2542717.99),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 2475485.27)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Cash Balance', v_count;
  END IF;

  -- Utilization - A&A
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - A&A';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Utilization - A&A: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 57.18),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 67),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 57),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 53),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 43),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 65),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 32),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 64),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 64),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 50),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 67)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Utilization - A&A', v_count;
  END IF;

  -- Utilization - BAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - BAS';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Utilization - BAS: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 45.82),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 58),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 49),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 49),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 47),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 29),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 28),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 42),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 49),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 43),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 59)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Utilization - BAS', v_count;
  END IF;

  -- Utilization - Total
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - Total';
  
  IF v_metric_id IS NOT NULL THEN
    RAISE NOTICE 'Inserting data for Utilization - Total: %', v_metric_id;
    
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 51.27),
    (gen_random_uuid(), v_metric_id, '2025-08-10', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-03', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 58),
    (gen_random_uuid(), v_metric_id, '2025-07-20', 37),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 56),
    (gen_random_uuid(), v_metric_id, '2025-07-13', 30),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 57),
    (gen_random_uuid(), v_metric_id, '2025-06-06', 57),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 47),
    (gen_random_uuid(), v_metric_id, '2025-05-25', 61)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Inserted/Updated % rows for Utilization - Total', v_count;
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
  MAX(ss.week_date)::text as latest_date
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.display_order
ORDER BY sm.display_order;