-- =====================================================
-- Debug IT Team Scorecard Display Issue
-- =====================================================

-- 1. Get exact IT Team ID
SELECT 
    t.id as team_id,
    t.name,
    t.organization_id,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team';

-- 2. Check if metrics have the required fields that might be expected by the UI
SELECT 
    sm.id,
    sm.organization_id,
    sm.team_id,
    sm.name,
    sm.goal,
    sm.owner_id,  -- This might be required
    sm.type,
    sm.value_type,
    sm.comparison_operator,
    sm.is_active,
    sm.display_order,
    sm.unit,
    sm.group_id
FROM scorecard_metrics sm
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
ORDER BY sm.name;

-- 3. Check if the issue is with weekly vs monthly type
SELECT 
    type as frequency,
    COUNT(*) as count
FROM scorecard_metrics
WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
GROUP BY type;

-- 4. Compare IT Team metrics structure with Leadership Team metrics (that work)
SELECT 
    'Leadership' as team,
    COUNT(*) as metric_count,
    COUNT(owner_id) as with_owner,
    COUNT(display_order) as with_order
FROM scorecard_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND team_id = '00000000-0000-0000-0000-000000000000'
UNION ALL
SELECT 
    'IT Team' as team,
    COUNT(*) as metric_count,
    COUNT(owner_id) as with_owner,
    COUNT(display_order) as with_order
FROM scorecard_metrics
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428';

-- 5. Check is_active flag specifically
SELECT 
    name,
    is_active,
    owner_id,
    display_order
FROM scorecard_metrics
WHERE team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
ORDER BY name;