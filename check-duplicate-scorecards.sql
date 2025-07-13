-- Check for duplicate scorecards in the database

-- 1. Count metrics by organization
SELECT 
    o.id as org_id,
    o.name as org_name,
    COUNT(DISTINCT sm.id) as metric_count,
    COUNT(DISTINCT sm.team_id) as unique_team_ids,
    STRING_AGG(DISTINCT sm.team_id::text, ', ') as team_ids
FROM organizations o
LEFT JOIN scorecard_metrics sm ON o.id = sm.organization_id
WHERE o.name ILIKE '%Bennett%'
GROUP BY o.id, o.name;

-- 2. Show all metrics for Bennett with their team IDs
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.organization_id,
    sm.team_id,
    sm.goal,
    sm.owner,
    sm.created_at,
    o.name as org_name
FROM scorecard_metrics sm
JOIN organizations o ON sm.organization_id = o.id
WHERE o.name ILIKE '%Bennett%'
ORDER BY sm.created_at DESC;

-- 3. Check for metrics with different team_ids in same org
SELECT 
    organization_id,
    COUNT(DISTINCT team_id) as unique_team_count,
    COUNT(*) as total_metrics,
    STRING_AGG(DISTINCT team_id::text, ', ') as team_ids
FROM scorecard_metrics
GROUP BY organization_id
HAVING COUNT(DISTINCT team_id) > 1;

-- 4. Show weekly scores for Bennett metrics to see if data differs
SELECT 
    sm.name as metric_name,
    sm.team_id,
    ss.week_date,
    ss.value,
    ss.updated_at
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.name ILIKE '%Bennett%'
    AND ss.week_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY sm.name, ss.week_date DESC;

-- 5. Check if there are any NULL or default team IDs
SELECT 
    team_id,
    COUNT(*) as metric_count,
    STRING_AGG(name, ', ') as metric_names
FROM scorecard_metrics
WHERE organization_id IN (
    SELECT id FROM organizations WHERE name ILIKE '%Bennett%'
)
GROUP BY team_id;