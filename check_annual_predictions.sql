-- Check what's in the one_year_plans table for demo org
SELECT 
  oyp.*,
  bb.organization_id
FROM one_year_plans oyp
JOIN business_blueprints bb ON oyp.vto_id = bb.id
WHERE bb.organization_id = 'deeeeeee-0000-0000-0000-000000000001';

-- Check if quarterly_predictions table exists and has data
SELECT 
  qp.*
FROM quarterly_predictions qp
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
ORDER BY quarter, year;