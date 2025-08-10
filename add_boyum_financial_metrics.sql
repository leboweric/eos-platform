-- Add Boyum Financial Metrics to Scorecard
-- These are weekly metrics for financial tracking

DO $$
DECLARE
  v_org_id UUID;
  v_team_id UUID;
  v_metric_order INTEGER;
BEGIN
  -- Get Boyum organization ID
  SELECT id INTO v_org_id FROM organizations WHERE name = 'Boyum Barenscheer';
  
  -- Get Leadership Team ID (special UUID)
  v_team_id := '00000000-0000-0000-0000-000000000000';
  
  -- Get the current max display order for existing metrics
  SELECT COALESCE(MAX(display_order), 0) INTO v_metric_order
  FROM scorecard_metrics 
  WHERE organization_id = v_org_id AND team_id = v_team_id;
  
  -- Add financial metrics with appropriate settings
  INSERT INTO scorecard_metrics (
    id, organization_id, team_id, name, goal, owner, type, 
    value_type, comparison_operator, description, display_order
  )
  VALUES 
  -- Revenue metrics
  (gen_random_uuid(), v_org_id, v_team_id, 'Rainmaker $ Added', 
   3, 'Patty', 'weekly', 'currency', 'greater_equal', 
   'New revenue from rainmaker activities', v_metric_order + 1),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'YTD Billing Realization', 
   98, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Year-to-date billing realization percentage', v_metric_order + 2),
  
  -- Active Production metrics
  (gen_random_uuid(), v_org_id, v_team_id, 'Active Production - AA', 
   0, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Active production percentage for AA category', v_metric_order + 3),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Active Production - BAS', 
   0, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Active production percentage for BAS category', v_metric_order + 4),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Active Production - CAS', 
   0, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Active production percentage for CAS category', v_metric_order + 5),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Active Production - Tax', 
   0, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Active production percentage for Tax category', v_metric_order + 6),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Active Production Goal', 
   0, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Overall active production goal percentage', v_metric_order + 7),
  
  -- Cash and billing metrics
  (gen_random_uuid(), v_org_id, v_team_id, 'Cash Balance', 
   0, 'Patty', 'weekly', 'currency', 'greater_equal', 
   'Weekly cash balance', v_metric_order + 8),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Billing Goal', 
   100, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   '# of Clients with realization < 60%', v_metric_order + 9),
  
  (gen_random_uuid(), v_org_id, v_team_id, '# of Clients with realization < 60%', 
   0, 'Patty', 'weekly', 'number', 'less_equal', 
   'Number of clients with billing realization below 60%', v_metric_order + 10),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Total Adjustments for Billing < 60% Realization', 
   0, 'Patty', 'weekly', 'currency', 'less_equal', 
   'Total adjustments for billing below 60% realization', v_metric_order + 11),
  
  -- Utilization metrics
  (gen_random_uuid(), v_org_id, v_team_id, 'Utilization - A&A', 
   59.69, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Utilization percentage for Audit & Assurance', v_metric_order + 12),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Utilization - BAS', 
   67.37, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Utilization percentage for Business Advisory Services', v_metric_order + 13),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Utilization - BAS/CAS', 
   64.9, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Utilization percentage for BAS/CAS combined', v_metric_order + 14),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Utilization - Tax', 
   55.81, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Utilization percentage for Tax', v_metric_order + 15),
  
  (gen_random_uuid(), v_org_id, v_team_id, 'Utilization - Total', 
   59.91, 'Patty', 'weekly', 'percentage', 'greater_equal', 
   'Total utilization percentage across all departments', v_metric_order + 16),
  
  -- Revenue Per FTE vs Prior Year metric
  (gen_random_uuid(), v_org_id, v_team_id, 'Revenue Per FTE vs Prior Year', 
   0, 'Patty', 'weekly', 'currency', 'greater_equal', 
   'Revenue per FTE compared to prior year', v_metric_order + 16);
  
  RAISE NOTICE 'Successfully added 17 financial metrics for Boyum Barenscheer';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding financial metrics: %', SQLERRM;
    RAISE;
END $$;

-- Verify the metrics were added
SELECT name, goal, value_type, comparison_operator, type, owner 
FROM scorecard_metrics 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND team_id = '00000000-0000-0000-0000-000000000000'
  AND type = 'weekly'
ORDER BY display_order;