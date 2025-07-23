-- Diagnostic queries to investigate Skykit scorecard data loss
-- Run these queries in order to diagnose the issue

-- 1. Check if Skykit organization exists and its current state
SELECT 
    id, 
    name, 
    created_at,
    revenue_metric_type,
    revenue_metric_label,
    CASE 
        WHEN revenue_metric_type IS NULL THEN 'NULL - Migration may have failed'
        ELSE 'OK'
    END as migration_status
FROM organizations 
WHERE LOWER(name) LIKE '%skykit%';

-- 2. Check if scorecard metrics exist for Skykit (by organization name)
SELECT 
    sm.id as metric_id,
    sm.name as metric_name,
    sm.organization_id,
    o.name as org_name,
    sm.created_at,
    sm.updated_at
FROM scorecard_metrics sm
JOIN organizations o ON sm.organization_id = o.id
WHERE LOWER(o.name) LIKE '%skykit%'
ORDER BY sm.created_at DESC;

-- 3. Check for orphaned scorecard metrics (metrics without valid organization)
SELECT 
    sm.id as metric_id,
    sm.name as metric_name,
    sm.organization_id,
    sm.created_at,
    'ORPHANED - No matching organization' as status
FROM scorecard_metrics sm
WHERE sm.organization_id NOT IN (SELECT id FROM organizations)
ORDER BY sm.created_at DESC;

-- 4. Check all scorecard metrics for Skykit using the ID from query #1
SELECT 
    COUNT(*) as total_metrics,
    MIN(created_at) as oldest_metric,
    MAX(created_at) as newest_metric,
    MAX(updated_at) as last_updated
FROM scorecard_metrics
WHERE organization_id = '22c2e9d6-3518-4aa3-b945-c9580d638457';

-- 5. Check recent scorecard metric changes (last 24 hours)
SELECT 
    sm.id,
    sm.name,
    sm.organization_id,
    o.name as org_name,
    sm.updated_at,
    CASE 
        WHEN sm.updated_at > NOW() - INTERVAL '24 hours' THEN 'Recently modified'
        ELSE 'Not recently modified'
    END as recent_change
FROM scorecard_metrics sm
LEFT JOIN organizations o ON sm.organization_id = o.id
WHERE sm.updated_at > NOW() - INTERVAL '24 hours'
   OR LOWER(o.name) LIKE '%skykit%'
ORDER BY sm.updated_at DESC;

-- 6. Check scorecard entries/data for Skykit
SELECT 
    se.id as entry_id,
    sm.name as metric_name,
    o.name as org_name,
    se.value,
    se.date,
    se.created_at
FROM scorecard_entries se
JOIN scorecard_metrics sm ON se.metric_id = sm.id
JOIN organizations o ON sm.organization_id = o.id
WHERE LOWER(o.name) LIKE '%skykit%'
ORDER BY se.date DESC
LIMIT 20;

-- 7. Check if there are any scorecard metrics with Skykit-like names but wrong org
SELECT 
    sm.id,
    sm.name as metric_name,
    sm.organization_id,
    o.name as org_name
FROM scorecard_metrics sm
JOIN organizations o ON sm.organization_id = o.id
WHERE LOWER(sm.name) LIKE '%skykit%'
   OR LOWER(sm.description) LIKE '%skykit%';

-- 8. Check migration status
SELECT 
    COUNT(*) as total_orgs,
    COUNT(revenue_metric_type) as orgs_with_revenue_type,
    COUNT(*) - COUNT(revenue_metric_type) as orgs_missing_revenue_type
FROM organizations;

-- 9. List all organizations to find Skykit if name changed
SELECT 
    id,
    name,
    created_at,
    revenue_metric_type
FROM organizations
ORDER BY name;