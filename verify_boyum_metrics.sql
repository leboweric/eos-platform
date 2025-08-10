-- Verify which metrics exist for Boyum Barenscheer
SELECT 
  name,
  type,
  goal,
  value_type,
  comparison_operator,
  owner,
  display_order
FROM scorecard_metrics 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY display_order;