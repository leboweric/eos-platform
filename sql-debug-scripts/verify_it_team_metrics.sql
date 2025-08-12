-- =====================================================
-- Verify IT Team Metrics Were Created
-- =====================================================

-- 1. Check if IT Team exists and get its ID
SELECT 
    t.id as team_id,
    t.name as team_name,
    o.name as org_name,
    o.slug as org_slug
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team';

-- 2. Check all metrics for IT Team
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.goal,
    sm.comparison_operator as operator,
    sm.value_type,
    sm.type as frequency,
    t.name as team_name
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
ORDER BY sm.name;

-- 3. Count metrics by team for Boyum
SELECT 
    t.name as team_name,
    t.id as team_id,
    COUNT(sm.id) as metric_count
FROM teams t
LEFT JOIN scorecard_metrics sm ON t.id = sm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
GROUP BY t.name, t.id
ORDER BY metric_count DESC;

-- 4. Check for any scorecard_scores (actual data) for IT Team
SELECT 
    sm.name as metric_name,
    COUNT(ss.id) as score_count
FROM scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON sm.id = ss.metric_id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY sm.name
ORDER BY sm.name;

-- 5. Check if there might be duplicate metrics (same name, different teams)
SELECT 
    sm.name,
    COUNT(*) as duplicate_count,
    STRING_AGG(t.name, ', ') as teams
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
GROUP BY sm.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;