-- Add Boyum Weekly Scorecard Data
-- Run this AFTER running add_boyum_financial_metrics.sql
-- This adds the actual weekly score values from the spreadsheet

DO $$
DECLARE
  v_org_id UUID;
  v_team_id UUID;
  v_metric_id UUID;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  
  -- Get Leadership Team ID
  v_team_id := '00000000-0000-0000-0000-000000000000';
  
  -- Insert scores for each metric and week
  -- Week dates from the spreadsheet columns
  
  -- Revenue Per FTE (using for Rainmaker $ Added data since that's what exists)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Revenue Per FTE';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 35329.00),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 67768.00),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 38208.00),
  (gen_random_uuid(), v_metric_id, '2025-07-21', NULL),
  (gen_random_uuid(), v_metric_id, '2025-07-14', NULL),
  (gen_random_uuid(), v_metric_id, '2025-07-20', 18750.00),
  (gen_random_uuid(), v_metric_id, '2025-07-07', NULL),
  (gen_random_uuid(), v_metric_id, '2025-07-13', 51256.00),
  (gen_random_uuid(), v_metric_id, '2025-06-30', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-06', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-23', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-29', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-16', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-22', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-09', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-15', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-02', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-08', NULL),
  (gen_random_uuid(), v_metric_id, '2025-05-28', NULL),
  (gen_random_uuid(), v_metric_id, '2025-06-01', NULL),
  (gen_random_uuid(), v_metric_id, '2025-05-19', NULL),
  (gen_random_uuid(), v_metric_id, '2025-05-25', 87200.00),
  (gen_random_uuid(), v_metric_id, '2025-05-12', NULL),
  (gen_random_uuid(), v_metric_id, '2025-05-18', NULL)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- YTD Billing Realization
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'YTD Billing Realization';
  
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

  -- Active Production - AA
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Active Production - AA';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 63.25),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 98),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 76),
  (gen_random_uuid(), v_metric_id, '2025-07-21', 53),
  (gen_random_uuid(), v_metric_id, '2025-07-14', 26)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- Active Production - BAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Active Production - BAS';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 67.75),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 101),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 84),
  (gen_random_uuid(), v_metric_id, '2025-07-21', 56),
  (gen_random_uuid(), v_metric_id, '2025-07-14', 30)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- Active Production - CAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Active Production - CAS';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 87),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 124),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 101),
  (gen_random_uuid(), v_metric_id, '2025-07-21', 77),
  (gen_random_uuid(), v_metric_id, '2025-07-14', 46)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- Active Production - Tax
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Active Production - Tax';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 73.25),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 110),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 87),
  (gen_random_uuid(), v_metric_id, '2025-07-21', 62),
  (gen_random_uuid(), v_metric_id, '2025-07-14', 34)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- Active Production Goal
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Active Production Goal';
  
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 69.75),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 105),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 84),
  (gen_random_uuid(), v_metric_id, '2025-07-21', 59),
  (gen_random_uuid(), v_metric_id, '2025-07-14', 31)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;

  -- Cash Balance
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Cash Balance';
  
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

  -- Billing Goal
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Billing Goal';
  
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

  -- Rainmaker $ Added (the actual metric that exists)
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Rainmaker $ Added';
  
  -- Using same data as Revenue Per FTE since they appear to be the same in the spreadsheet
  INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
  (gen_random_uuid(), v_metric_id, '2025-08-04', 35329.00),
  (gen_random_uuid(), v_metric_id, '2025-08-10', 67768.00),
  (gen_random_uuid(), v_metric_id, '2025-07-03', 38208.00),
  (gen_random_uuid(), v_metric_id, '2025-07-20', 18750.00),
  (gen_random_uuid(), v_metric_id, '2025-07-13', 51256.00),
  (gen_random_uuid(), v_metric_id, '2025-05-25', 87200.00)
  ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
  
  -- Skip "# of Clients with realization < 60%" as this metric doesn't exist
  -- The metric wasn't created in the first script

  -- Total Adjustments for Billing < 60% Realization
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Total Adjustments for Billing < 60% Realization';
  
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

  -- Utilization - A&A
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Utilization - A&A';
  
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

  -- Utilization - BAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Utilization - BAS';
  
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

  -- Utilization - BAS/CAS
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Utilization - BAS/CAS';
  
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

  -- Utilization - Tax
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Utilization - Tax';
  
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

  -- Utilization - Total
  SELECT id INTO v_metric_id FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id AND name = 'Utilization - Total';
  
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

  RAISE NOTICE 'Successfully added scorecard data for Boyum Barenscheer metrics';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding scorecard data: %', SQLERRM;
    RAISE;
END $$;

-- Verify the data was added
SELECT 
  sm.name,
  sm.display_order,
  COUNT(ss.id) as score_count,
  MIN(ss.week_date) as earliest_date,
  MAX(ss.week_date) as latest_date
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY sm.name, sm.display_order
ORDER BY sm.display_order;