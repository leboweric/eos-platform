-- Simple User Utilization Monitoring Script
-- Focuses on core metrics that work with the current database schema

-- =====================================================
-- 1. USER LOGIN ACTIVITY
-- =====================================================
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    o.name as organization_name,
    u.role,
    u.last_login_at,
    CASE 
        WHEN u.last_login_at IS NULL THEN 'Never logged in'
        WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 'Active today'
        WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'Active this week'
        WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'Active this month'
        ELSE 'Inactive (30+ days)'
    END as activity_status
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
ORDER BY u.last_login_at DESC NULLS LAST;

-- =====================================================
-- 2. ORGANIZATION SUMMARY
-- =====================================================
SELECT 
    o.name as organization_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN u.id END) as active_last_week,
    COUNT(DISTINCT CASE WHEN u.last_login_at IS NULL THEN u.id END) as never_logged_in
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
GROUP BY o.id, o.name;

-- =====================================================
-- 3. FEATURE USAGE SUMMARY (Last 30 days)
-- =====================================================
SELECT 
    'Priorities' as feature,
    COUNT(DISTINCT qp.owner_id) as unique_users,
    COUNT(*) as total_items
FROM quarterly_priorities qp
WHERE qp.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND qp.deleted_at IS NULL

UNION ALL

SELECT 
    'Issues' as feature,
    COUNT(DISTINCT i.created_by) as unique_users,
    COUNT(*) as total_items
FROM issues i
WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND i.deleted_at IS NULL

UNION ALL

SELECT 
    'To-Dos' as feature,
    COUNT(DISTINCT t.assigned_to_id) as unique_users,
    COUNT(*) as total_items
FROM todos t
WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND t.deleted_at IS NULL

ORDER BY total_items DESC;

-- =====================================================
-- 4. USER ACTIVITY SUMMARY
-- =====================================================
WITH user_stats AS (
    SELECT 
        u.id,
        u.email,
        u.first_name || ' ' || u.last_name as full_name,
        o.name as organization_name,
        u.last_login_at,
        (SELECT COUNT(*) FROM quarterly_priorities WHERE owner_id = u.id AND deleted_at IS NULL) as total_priorities,
        (SELECT COUNT(*) FROM todos WHERE assigned_to_id = u.id AND deleted_at IS NULL) as total_todos,
        (SELECT COUNT(*) FROM issues WHERE created_by = u.id AND deleted_at IS NULL) as total_issues
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
)
SELECT 
    email,
    full_name,
    organization_name,
    last_login_at,
    total_priorities,
    total_todos,
    total_issues,
    (total_priorities + total_todos + total_issues) as total_items,
    CASE 
        WHEN last_login_at IS NULL THEN 'Never logged in'
        WHEN last_login_at < CURRENT_TIMESTAMP - INTERVAL '30 days' THEN 'Inactive'
        WHEN (total_priorities + total_todos + total_issues) = 0 THEN 'Viewer'
        WHEN (total_priorities + total_todos + total_issues) > 10 THEN 'Power User'
        ELSE 'Active User'
    END as user_type
FROM user_stats
ORDER BY total_items DESC, last_login_at DESC NULLS LAST;

-- =====================================================
-- 5. SKYKIT QUICK SUMMARY
-- =====================================================
SELECT 
    'Total Users' as metric,
    COUNT(*) as value
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE o.name = 'Skykit'

UNION ALL

SELECT 
    'Active This Week' as metric,
    COUNT(*) as value
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE o.name = 'Skykit'
  AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days'

UNION ALL

SELECT 
    'Total Priorities' as metric,
    COUNT(*) as value
FROM quarterly_priorities qp
JOIN organizations o ON qp.organization_id = o.id
WHERE o.name = 'Skykit'
  AND qp.deleted_at IS NULL

UNION ALL

SELECT 
    'Total To-Dos' as metric,
    COUNT(*) as value
FROM todos t
JOIN users u ON t.assigned_to_id = u.id
JOIN organizations o ON u.organization_id = o.id
WHERE o.name = 'Skykit'
  AND t.deleted_at IS NULL;