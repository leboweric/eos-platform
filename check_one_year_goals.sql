-- Check if 1-Year Goals exist in the database
-- First, find the one year plan for Boyum organization

-- Get the organization and VTO IDs
SELECT 
    o.id as org_id,
    o.name as org_name,
    bp.id as vto_id
FROM organizations o
JOIN business_blueprints bp ON bp.organization_id = o.id
WHERE o.slug = 'boyum'
  AND bp.team_id IS NULL;  -- Organization-level blueprint

-- Get the one year plan
SELECT 
    oyp.id as plan_id,
    oyp.vto_id,
    oyp.future_date,
    oyp.revenue_target,
    oyp.profit_percentage
FROM one_year_plans oyp
JOIN business_blueprints bp ON bp.id = oyp.vto_id
JOIN organizations o ON o.id = bp.organization_id
WHERE o.slug = 'boyum';

-- Check the actual goals
SELECT 
    oyg.*,
    oyp.future_date,
    o.name as org_name
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyp.id = oyg.one_year_plan_id
JOIN business_blueprints bp ON bp.id = oyp.vto_id
JOIN organizations o ON o.id = bp.organization_id
WHERE o.slug = 'boyum'
ORDER BY oyg.sort_order;

-- Count goals per organization
SELECT 
    o.name as org_name,
    o.slug,
    COUNT(oyg.id) as goal_count
FROM organizations o
LEFT JOIN business_blueprints bp ON bp.organization_id = o.id AND bp.team_id IS NULL
LEFT JOIN one_year_plans oyp ON oyp.vto_id = bp.id
LEFT JOIN one_year_goals oyg ON oyg.one_year_plan_id = oyp.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.name;

-- Check revenue streams
SELECT 
    rs.*,
    oyp.future_date,
    o.name as org_name
FROM one_year_revenue_streams rs
JOIN one_year_plans oyp ON oyp.id = rs.one_year_plan_id
JOIN business_blueprints bp ON bp.id = oyp.vto_id
JOIN organizations o ON o.id = bp.organization_id
WHERE o.slug = 'boyum'
ORDER BY rs.display_order;