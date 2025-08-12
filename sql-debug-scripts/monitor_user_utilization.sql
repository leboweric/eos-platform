-- User Utilization and Login Activity Monitoring Script
-- This script provides insights into who's using the platform and how frequently

-- =====================================================
-- 1. USER LOGIN ACTIVITY (Last 30 days)
-- =====================================================
-- Shows when users last logged in and their login frequency
SELECT 
    u.id,
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
    END as activity_status,
    CASE 
        WHEN u.last_login_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.last_login_at))/86400
        ELSE NULL
    END as days_since_last_login
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
ORDER BY u.last_login_at DESC NULLS LAST;

-- =====================================================
-- 2. ORGANIZATION-LEVEL UTILIZATION SUMMARY
-- =====================================================
-- Shows activity summary by organization
SELECT 
    o.name as organization_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN u.id END) as active_last_7_days,
    COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days' THEN u.id END) as active_last_30_days,
    COUNT(DISTINCT CASE WHEN u.last_login_at IS NULL THEN u.id END) as never_logged_in,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN u.id END) / 
          NULLIF(COUNT(DISTINCT u.id), 0), 1) as weekly_active_percentage
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id
GROUP BY o.id, o.name
ORDER BY total_users DESC;

-- =====================================================
-- 3. USER ACTIVITY HEATMAP (by day of week and hour)
-- =====================================================
-- Shows when users are most active (requires login_history table)
-- Note: This query assumes you have a login_history or audit_logs table
-- Comment out if not available
/*
SELECT 
    EXTRACT(DOW FROM login_timestamp) as day_of_week,
    EXTRACT(HOUR FROM login_timestamp) as hour_of_day,
    COUNT(*) as login_count
FROM login_history
WHERE login_timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;
*/

-- =====================================================
-- 4. FEATURE UTILIZATION (Last 30 days)
-- =====================================================
-- Shows which features are being used
SELECT 
    'Priorities' as feature,
    COUNT(DISTINCT qp.created_by) as unique_users,
    COUNT(*) as total_actions
FROM quarterly_priorities qp
WHERE qp.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND qp.deleted_at IS NULL

UNION ALL

SELECT 
    'Scorecard Metrics' as feature,
    COUNT(DISTINCT sm.created_by) as unique_users,
    COUNT(*) as total_actions
FROM scorecard_metrics sm
WHERE sm.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND sm.deleted_at IS NULL

UNION ALL

SELECT 
    'Issues' as feature,
    COUNT(DISTINCT i.created_by) as unique_users,
    COUNT(*) as total_actions
FROM issues i
WHERE i.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND i.deleted_at IS NULL

UNION ALL

SELECT 
    'To-Dos' as feature,
    COUNT(DISTINCT t.created_by) as unique_users,
    COUNT(*) as total_actions
FROM todos t
WHERE t.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND t.deleted_at IS NULL

ORDER BY total_actions DESC;

-- =====================================================
-- 5. USER ENGAGEMENT SCORE
-- =====================================================
-- Calculates an engagement score based on various activities
WITH user_activity AS (
    SELECT 
        u.id as user_id,
        u.email,
        u.first_name || ' ' || u.last_name as full_name,
        o.name as organization_name,
        -- Count activities in last 30 days
        (SELECT COUNT(*) FROM quarterly_priorities WHERE created_by = u.id AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL) as priorities_created,
        (SELECT COUNT(*) FROM scorecard_metrics WHERE created_by = u.id AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL) as metrics_created,
        (SELECT COUNT(*) FROM issues WHERE created_by = u.id AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL) as issues_created,
        (SELECT COUNT(*) FROM todos WHERE created_by = u.id AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days' AND deleted_at IS NULL) as todos_created,
        (SELECT COUNT(*) FROM priority_updates WHERE created_by = u.id AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as updates_made,
        u.last_login_at
    FROM users u
    LEFT JOIN organizations o ON u.organization_id = o.id
)
SELECT 
    user_id,
    email,
    full_name,
    organization_name,
    priorities_created,
    metrics_created,
    issues_created,
    todos_created,
    updates_made,
    (priorities_created * 3 + metrics_created * 2 + issues_created * 2 + todos_created + updates_made) as engagement_score,
    CASE 
        WHEN last_login_at IS NULL THEN 'Inactive'
        WHEN (priorities_created + metrics_created + issues_created + todos_created + updates_made) = 0 THEN 'Viewer Only'
        WHEN (priorities_created * 3 + metrics_created * 2 + issues_created * 2 + todos_created + updates_made) >= 20 THEN 'Highly Engaged'
        WHEN (priorities_created * 3 + metrics_created * 2 + issues_created * 2 + todos_created + updates_made) >= 10 THEN 'Moderately Engaged'
        ELSE 'Low Engagement'
    END as engagement_level
FROM user_activity
ORDER BY engagement_score DESC;

-- =====================================================
-- 6. INACTIVE USERS REPORT
-- =====================================================
-- Identifies users who haven't logged in recently
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    o.name as organization_name,
    u.created_at as account_created,
    u.last_login_at,
    CASE 
        WHEN u.last_login_at IS NULL THEN 'Never'
        ELSE EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - u.last_login_at))/86400 || ' days ago'
    END as last_login_display
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE 1=1  -- No deleted_at column in users table
  AND (u.last_login_at IS NULL OR u.last_login_at < CURRENT_TIMESTAMP - INTERVAL '30 days')
ORDER BY u.last_login_at ASC NULLS FIRST;

-- =====================================================
-- 7. DAILY ACTIVE USERS (DAU) TREND
-- =====================================================
-- Shows daily active users for the last 30 days
-- (Based on last_login_at, which may not capture all activity)
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        '1 day'::interval
    )::date as activity_date
)
SELECT 
    ds.activity_date,
    COUNT(DISTINCT u.id) as daily_active_users
FROM date_series ds
LEFT JOIN users u ON DATE(u.last_login_at) = ds.activity_date
GROUP BY ds.activity_date
ORDER BY ds.activity_date DESC;

-- =====================================================
-- 8. POWER USERS
-- =====================================================
-- Identifies the most active users in the system
SELECT 
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    o.name as organization_name,
    COUNT(DISTINCT qp.id) as priorities_owned,
    COUNT(DISTINCT t.id) as todos_assigned,
    COUNT(DISTINCT i.id) as issues_created,
    COUNT(DISTINCT pu.id) as priority_updates,
    u.last_login_at
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id AND qp.deleted_at IS NULL
LEFT JOIN todos t ON u.id = t.assigned_to_id AND t.deleted_at IS NULL
LEFT JOIN issues i ON u.id = i.created_by AND i.deleted_at IS NULL
LEFT JOIN priority_updates pu ON u.id = pu.created_by AND pu.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
WHERE 1=1  -- No deleted_at column in users table
  AND u.last_login_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY u.id, u.email, u.first_name, u.last_name, o.name, u.last_login_at
HAVING COUNT(DISTINCT qp.id) + COUNT(DISTINCT t.id) + COUNT(DISTINCT i.id) > 0
ORDER BY (COUNT(DISTINCT qp.id) + COUNT(DISTINCT t.id) + COUNT(DISTINCT i.id) + COUNT(DISTINCT pu.id)) DESC
LIMIT 20;