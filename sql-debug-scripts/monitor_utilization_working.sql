-- User Utilization Monitoring Script (Working Version)
-- Uses only columns that exist in the database

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
    COUNT(DISTINCT CASE WHEN u.last_login_at IS NULL THEN u.id END) as never_logged_in,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN u.id END) / 
          NULLIF(COUNT(DISTINCT u.id), 0), 1) as weekly_active_percentage
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
GROUP BY o.id, o.name;

-- =====================================================
-- 3. CONTENT CREATED (Last 30 days)
-- =====================================================
SELECT 
    'Priorities Created' as activity_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT qp.owner_id) as unique_users
FROM quarterly_priorities qp
WHERE qp.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND qp.deleted_at IS NULL

UNION ALL

SELECT 
    'To-Dos Created' as activity_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT t.assigned_to_id) as unique_users  
FROM todos t
WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND t.deleted_at IS NULL

UNION ALL

SELECT 
    'Issues Created' as activity_type,
    COUNT(*) as total_count,
    COUNT(DISTINCT i.team_id) as unique_teams  -- Using team_id since created_by doesn't exist
FROM issues i
WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND i.deleted_at IS NULL

ORDER BY total_count DESC;

-- =====================================================
-- 4. USER WORKLOAD SUMMARY
-- =====================================================
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    o.name as organization_name,
    COUNT(DISTINCT qp.id) as priorities_owned,
    COUNT(DISTINCT t.id) as todos_assigned,
    u.last_login_at,
    CASE 
        WHEN u.last_login_at IS NULL THEN 'Inactive'
        WHEN u.last_login_at < CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 'Low Activity'
        ELSE 'Active'
    END as activity_level
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id AND qp.deleted_at IS NULL
LEFT JOIN todos t ON u.id = t.assigned_to_id AND t.deleted_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name, o.name, u.last_login_at
ORDER BY (COUNT(DISTINCT qp.id) + COUNT(DISTINCT t.id)) DESC;

-- =====================================================
-- 5. RECENT ACTIVITY (Last 7 days)
-- =====================================================
WITH recent_activity AS (
    SELECT 'Priority' as item_type, title, created_at, owner_id as user_id
    FROM quarterly_priorities
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
      AND deleted_at IS NULL
    
    UNION ALL
    
    SELECT 'To-Do' as item_type, title, created_at, assigned_to_id as user_id
    FROM todos
    WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
      AND deleted_at IS NULL
)
SELECT 
    ra.item_type,
    ra.title,
    ra.created_at,
    u.email as created_for,
    u.first_name || ' ' || u.last_name as user_name
FROM recent_activity ra
LEFT JOIN users u ON ra.user_id = u.id
ORDER BY ra.created_at DESC
LIMIT 20;

-- =====================================================
-- 6. SKYKIT ORGANIZATION METRICS
-- =====================================================
WITH skykit_metrics AS (
    SELECT 
        (SELECT COUNT(*) FROM users u JOIN organizations o ON u.organization_id = o.id WHERE o.name = 'Skykit') as total_users,
        (SELECT COUNT(*) FROM users u JOIN organizations o ON u.organization_id = o.id WHERE o.name = 'Skykit' AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_users,
        (SELECT COUNT(*) FROM quarterly_priorities qp JOIN organizations o ON qp.organization_id = o.id WHERE o.name = 'Skykit' AND qp.deleted_at IS NULL) as total_priorities,
        (SELECT COUNT(*) FROM todos t JOIN users u ON t.assigned_to_id = u.id JOIN organizations o ON u.organization_id = o.id WHERE o.name = 'Skykit' AND t.deleted_at IS NULL) as total_todos,
        (SELECT COUNT(*) FROM issues i JOIN organizations o ON i.organization_id = o.id WHERE o.name = 'Skykit' AND i.deleted_at IS NULL) as total_issues
)
SELECT 
    'Skykit Organization Metrics' as report_title,
    total_users,
    active_users,
    ROUND(100.0 * active_users / NULLIF(total_users, 0), 1) as active_user_percentage,
    total_priorities,
    total_todos,
    total_issues,
    (total_priorities + total_todos + total_issues) as total_items
FROM skykit_metrics;

-- =====================================================
-- 7. INACTIVE USERS (Need Attention)
-- =====================================================
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    o.name as organization_name,
    u.created_at as account_created,
    u.last_login_at,
    CASE 
        WHEN u.last_login_at IS NULL THEN 'Never logged in'
        ELSE ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.last_login_at))/86400) || ' days ago'
    END as last_activity
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE (u.last_login_at IS NULL OR u.last_login_at < CURRENT_TIMESTAMP - INTERVAL '14 days')
ORDER BY u.last_login_at ASC NULLS FIRST;