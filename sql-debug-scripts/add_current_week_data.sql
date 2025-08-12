-- Add current week data for Boyum scorecard
-- This adds data for January 2025 weeks so it shows up in the UI

DO $$
DECLARE
  v_org_id UUID;
  v_metric_id UUID;
  v_count INTEGER;
  v_current_week DATE;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  
  -- Get the Monday of current week
  v_current_week := date_trunc('week', CURRENT_DATE)::date;
  RAISE NOTICE 'Adding data for week of: %', v_current_week;
  
  -- Add data for each metric for current and past few weeks
  FOR i IN 0..12 LOOP
    -- Revenue Per FTE
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Revenue Per FTE';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 45000 + (random() * 20000))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- YTD Billing Realization
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'YTD Billing Realization';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 95 + (random() * 3))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Cash Balance
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Cash Balance';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 2500000 + (random() * 200000))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Active Production - AA
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Active Production - AA';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 50 + (random() * 40))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Active Production - BAS
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Active Production - BAS';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 60 + (random() * 35))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Active Production - CAS
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Active Production - CAS';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 70 + (random() * 40))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Active Production - Tax
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Active Production - Tax';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 60 + (random() * 35))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Active Production Goal
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Active Production Goal';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 60 + (random() * 35))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Billing Goal
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Billing Goal';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 20 + (random() * 60))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Total Adjustments
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Total Adjustments for Billing < 60% Realization';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), -10000 - (random() * 50000))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Utilization - A&A
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Utilization - A&A';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 50 + (random() * 20))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Utilization - BAS
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Utilization - BAS';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 45 + (random() * 25))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Utilization - BAS/CAS
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Utilization - BAS/CAS';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 55 + (random() * 20))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Utilization - Tax
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Utilization - Tax';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 45 + (random() * 20))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

    -- Utilization - Total
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = v_org_id 
      AND team_id = '00000000-0000-0000-0000-000000000000' 
      AND name = 'Utilization - Total';
    
    IF v_metric_id IS NOT NULL THEN
      INSERT INTO scorecard_scores (id, metric_id, week_date, value) VALUES
      (gen_random_uuid(), v_metric_id, v_current_week - (i * 7), 50 + (random() * 15))
      ON CONFLICT (metric_id, week_date) DO UPDATE SET value = EXCLUDED.value;
    END IF;

  END LOOP;
  
  RAISE NOTICE 'Added data for current and past 12 weeks';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE;
END $$;

-- Verify what weeks have data now
SELECT 
  to_char(week_date, 'YYYY-MM-DD') as week,
  COUNT(DISTINCT metric_id) as metrics_with_data
FROM scorecard_scores
WHERE metric_id IN (
  SELECT id FROM scorecard_metrics 
  WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
    AND team_id = '00000000-0000-0000-0000-000000000000'
)
GROUP BY week_date
ORDER BY week_date DESC
LIMIT 20;