-- =====================================================
-- Check IT Team Metric Names
-- =====================================================

-- List all IT Team metrics to see exact names
SELECT 
    sm.name,
    sm.goal,
    sm.type,
    sm.comparison_operator,
    sm.owner
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
ORDER BY sm.name;

-- Check for metrics that might have slightly different names
SELECT 
    sm.name,
    CASE 
        WHEN sm.name LIKE '%Helpdesk%' THEN 'Found Helpdesk metric'
        WHEN sm.name LIKE '%Help%' THEN 'Found Help metric'
        WHEN sm.name LIKE '%Individual%' THEN 'Found Individual metric'
        ELSE 'Other'
    END as category
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
  AND (sm.name LIKE '%Individual%' OR sm.name LIKE '%Help%')
ORDER BY sm.name;