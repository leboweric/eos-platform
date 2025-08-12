-- =====================================================
-- Check Bennett's Scorecard Team IDs
-- =====================================================

-- 1. What is Bennett's current Leadership Team ID?
SELECT 
    'Bennett Leadership Team' as check_type,
    t.id,
    t.name,
    t.is_leadership_team
FROM teams t
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND t.is_leadership_team = true;

-- 2. What team IDs are Bennett's scorecard metrics using?
SELECT 
    'Scorecard Metrics by Team' as check_type,
    sm.team_id,
    t.name as team_name,
    COUNT(*) as metric_count
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
GROUP BY sm.team_id, t.name
ORDER BY metric_count DESC;

-- 3. List all Bennett's scorecard metrics with their team assignments
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.team_id,
    t.name as team_name,
    sm.type,
    sm.owner
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
ORDER BY sm.team_id, sm.name;

-- 4. Check if any metrics are orphaned (team doesn't exist or belongs to another org)
SELECT 
    'Orphaned Metrics' as check_type,
    sm.id,
    sm.name,
    sm.team_id,
    CASE 
        WHEN t.id IS NULL THEN 'Team does not exist'
        WHEN t.organization_id != sm.organization_id THEN 'Team belongs to different org: ' || o.name
        ELSE 'OK'
    END as issue
FROM scorecard_metrics sm
LEFT JOIN teams t ON sm.team_id = t.id
LEFT JOIN organizations o ON t.organization_id = o.id
WHERE sm.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
AND (t.id IS NULL OR t.organization_id != sm.organization_id);