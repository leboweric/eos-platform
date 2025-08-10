-- Fix Boyum Barenscheer scorecard data mapping
-- This script will clear existing data and reload it with correct metric mapping

DO $$
DECLARE
  v_org_id UUID;
  v_metric_id UUID;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  RAISE NOTICE 'Organization ID: %', v_org_id;

  -- First, clear all existing score data for this org
  DELETE FROM scorecard_scores 
  WHERE metric_id IN (
    SELECT id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000'
  );
  RAISE NOTICE 'Cleared existing scores';

  -- Now load the correct data based on the spreadsheet

  -- 1. Rainmaker $ Added / Revenue Per FTE (Row 1 in spreadsheet)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND (name = 'Rainmaker $ Added' OR name = 'Revenue Per FTE');
  
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
    RAISE NOTICE 'Loaded Rainmaker $ Added data';
  END IF;

  -- 2. YTD Billing Realization (Row 2)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'YTD Billing Realization';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 96.3),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 95.01),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 95.29),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 95.44),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 95.64),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 95.5),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 96.71),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 96.85),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 97.14),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 97.23),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 97.03),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 97.45),
    (gen_random_uuid(), v_metric_id, '2025-05-12', 97.6)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded YTD Billing Realization data';
  END IF;

  -- 3. Active Production - AA (Row 3)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - AA';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 63.25),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 98),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 76),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 53),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 26)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Active Production - AA data';
  END IF;

  -- 4. Active Production - BAS (Row 4)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - BAS';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 67.75),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 101),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 84),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 56),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 30)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Active Production - BAS data';
  END IF;

  -- 5. Active Production - CAS (Row 5)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - CAS';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 87),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 124),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 101),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 77),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 46)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Active Production - CAS data';
  END IF;

  -- 6. Active Production - Tax (Row 6)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production - Tax';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 73.25),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 110),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 87),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 62),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 34)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Active Production - Tax data';
  END IF;

  -- 7. Active Production Goal (Row 7)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Active Production Goal';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 69.75),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 105),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 84),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 31)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Active Production Goal data';
  END IF;

  -- 8. Cash Balance (Row 8)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Cash Balance';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 2597974.1),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 2632904.35),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 2650405.1),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 2299011.29),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 2624924.84),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 2554602.03),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 2625221.09),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 2560521.2),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 2982712.58),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 2629209.31),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 2542717.99),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 2475485.27)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Cash Balance data';
  END IF;

  -- 9. Billing Goal (Row 9)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Billing Goal';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 34.19),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 50),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 27.3),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 18.3),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 42.1),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 29.4),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 21.4),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 0),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 72.4),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 46.8)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Billing Goal data';
  END IF;

  -- 10. # of Clients with realization < 60% (Row 10) - Metric might not exist, skip for now
  
  -- 11. Total Adjustments for Billing < 60% Realization (Row 11)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Total Adjustments for Billing < 60% Realization';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', -30539.2),
    (gen_random_uuid(), v_metric_id, '2025-07-28', -17157.25),
    (gen_random_uuid(), v_metric_id, '2025-07-21', -35428.38),
    (gen_random_uuid(), v_metric_id, '2025-07-14', -41697.1),
    (gen_random_uuid(), v_metric_id, '2025-07-07', -75062.08),
    (gen_random_uuid(), v_metric_id, '2025-06-30', -19186.13),
    (gen_random_uuid(), v_metric_id, '2025-06-23', -19886.25),
    (gen_random_uuid(), v_metric_id, '2025-06-16', -36538.78),
    (gen_random_uuid(), v_metric_id, '2025-06-09', -9547.29),
    (gen_random_uuid(), v_metric_id, '2025-06-02', -15960),
    (gen_random_uuid(), v_metric_id, '2025-05-26', -34929.75)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Total Adjustments data';
  END IF;

  -- 12. Utilization - A&A (Row 12)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - A&A';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 57.18),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 67),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 57),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 52),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 69),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 42),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 65),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 32),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 64),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 64),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 50),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 67)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Utilization - A&A data';
  END IF;

  -- 13. Utilization - BAS (Row 13)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - BAS';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 45.82),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 58),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 49),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 47),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 29),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 51),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 28),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 42),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 49),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 43),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 59)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Utilization - BAS data';
  END IF;

  -- 14. Utilization - BAS/CAS (Row 14)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - BAS/CAS';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 56.82),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 49),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 61),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 69),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 44),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 61),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 33),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 69),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 61),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 43),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 76)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Utilization - BAS/CAS data';
  END IF;

  -- 15. Utilization - Tax (Row 15)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - Tax';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 48.36),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 55),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 50),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 48),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 54),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 35),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 51),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 29),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 54),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 55),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 47),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 54)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Utilization - Tax data';
  END IF;

  -- 16. Utilization - Total (Row 16)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id 
    AND team_id = '00000000-0000-0000-0000-000000000000' 
    AND name = 'Utilization - Total';
  
  IF v_metric_id IS NOT NULL THEN
    INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
    (gen_random_uuid(), v_metric_id, '2025-08-04', 51.27),
    (gen_random_uuid(), v_metric_id, '2025-07-28', 59),
    (gen_random_uuid(), v_metric_id, '2025-07-21', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-14', 51),
    (gen_random_uuid(), v_metric_id, '2025-07-07', 58),
    (gen_random_uuid(), v_metric_id, '2025-06-30', 37),
    (gen_random_uuid(), v_metric_id, '2025-06-23', 56),
    (gen_random_uuid(), v_metric_id, '2025-06-16', 30),
    (gen_random_uuid(), v_metric_id, '2025-06-09', 57),
    (gen_random_uuid(), v_metric_id, '2025-06-02', 57),
    (gen_random_uuid(), v_metric_id, '2025-05-26', 47),
    (gen_random_uuid(), v_metric_id, '2025-05-19', 61)
    ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    RAISE NOTICE 'Loaded Utilization - Total data';
  END IF;

  -- 17. Revenue Per FTE (Row 17) - This is the bottom row
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
    RAISE NOTICE 'Loaded Revenue Per FTE data';
  END IF;

  -- 18. Revenue Per FTE vs Prior Year (Row 18) - No data in spreadsheet, skip

  RAISE NOTICE 'Data reload complete!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify the corrected data
SELECT 
  sm.display_order,
  sm.name,
  sm.goal,
  ss.value as aug_4_value
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id AND ss.week_date = '2025-08-04'
WHERE sm.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY sm.display_order;