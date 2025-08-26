-- Debug Script: Find Rocks/Priorities for Strategic Consulting and Coaching
-- Run this in pgAdmin to investigate missing data

-- 1. First, find the organization
SELECT 
    id,
    name,
    created_at,
    settings
FROM organizations 
WHERE LOWER(name) LIKE '%strategic consulting%'
   OR LOWER(name) LIKE '%coaching%';

-- 2. Check quarterly_priorities (Rocks) for this org
-- Replace 'ORG_ID_HERE' with the actual UUID from query above
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    qp.id,
    qp.title,
    qp.description,
    qp.quarter,
    qp.year,
    qp.status,
    qp.progress,
    qp.owner_id,
    qp.team_id,
    qp.department_id,
    qp.created_at,
    qp.updated_at,
    qp.deleted_at,
    u.first_name || ' ' || u.last_name as owner_name,
    t.name as team_name,
    d.name as department_name
FROM quarterly_priorities qp
LEFT JOIN users u ON qp.owner_id = u.id
LEFT JOIN teams t ON qp.team_id = t.id
LEFT JOIN departments d ON qp.department_id = d.id
WHERE qp.organization_id IN (SELECT id FROM org_info)
ORDER BY qp.year DESC, qp.quarter DESC, qp.created_at DESC;

-- 3. Check if they might have been soft-deleted
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    COUNT(*) as total_rocks,
    SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active_rocks,
    SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_rocks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_rocks,
    SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_rocks
FROM quarterly_priorities 
WHERE organization_id IN (SELECT id FROM org_info);

-- 4. Check for current quarter rocks specifically
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    qp.*,
    'Q' || qp.quarter || ' ' || qp.year as period
FROM quarterly_priorities qp
WHERE qp.organization_id IN (SELECT id FROM org_info)
    AND qp.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND qp.quarter = EXTRACT(QUARTER FROM CURRENT_DATE)
    AND (qp.deleted_at IS NULL OR qp.deleted_at IS NOT NULL); -- Show both

-- 5. Check if there's a department/team filter issue
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    'Teams' as type,
    COUNT(*) as count
FROM teams 
WHERE organization_id IN (SELECT id FROM org_info)
UNION ALL
SELECT 
    'Departments' as type,
    COUNT(*) as count
FROM departments 
WHERE organization_id IN (SELECT id FROM org_info)
UNION ALL
SELECT 
    'Users' as type,
    COUNT(*) as count
FROM users 
WHERE organization_id IN (SELECT id FROM org_info);

-- 6. Check recent modifications/deletions in quarterly_priorities
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    qp.id,
    qp.title,
    qp.status,
    qp.created_at,
    qp.updated_at,
    qp.deleted_at,
    CASE 
        WHEN qp.deleted_at IS NOT NULL THEN 'DELETED on ' || qp.deleted_at::date
        WHEN qp.status = 'archived' THEN 'ARCHIVED'
        WHEN qp.status = 'completed' THEN 'COMPLETED'
        ELSE 'ACTIVE'
    END as current_state
FROM quarterly_priorities qp
WHERE qp.organization_id IN (SELECT id FROM org_info)
    AND (
        qp.updated_at > CURRENT_DATE - INTERVAL '30 days'
        OR qp.deleted_at > CURRENT_DATE - INTERVAL '30 days'
    )
ORDER BY COALESCE(qp.deleted_at, qp.updated_at) DESC;

-- 7. If using the new universal_objectives table (unlikely but check)
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    COUNT(*) as universal_objectives_count
FROM universal_objectives
WHERE organization_id IN (SELECT id FROM org_info);

-- 8. Check if there's a visibility/permission issue
WITH org_info AS (
    SELECT id, name, settings
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    o.name as org_name,
    o.settings->>'hide_completed_rocks' as hide_completed,
    o.settings->>'current_quarter_only' as current_quarter_only,
    o.settings->>'department_filter' as department_filter,
    o.settings->>'team_filter' as team_filter
FROM org_info o;

-- 9. Recovery: If rocks are soft-deleted, restore them
-- ONLY RUN THIS IF YOU CONFIRM THEY WERE ACCIDENTALLY DELETED
/*
WITH org_info AS (
    SELECT id 
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
UPDATE quarterly_priorities 
SET deleted_at = NULL
WHERE organization_id IN (SELECT id FROM org_info)
    AND deleted_at IS NOT NULL
    AND deleted_at > CURRENT_DATE - INTERVAL '7 days'; -- Only restore recent deletions
*/

-- 10. Final summary for the organization
WITH org_info AS (
    SELECT id, name
    FROM organizations 
    WHERE LOWER(name) LIKE '%strategic consulting%'
       OR LOWER(name) LIKE '%coaching%'
    LIMIT 1
)
SELECT 
    o.name as organization,
    o.id as org_id,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = o.id) as total_rocks_all_time,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = o.id AND deleted_at IS NULL) as active_rocks,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = o.id AND deleted_at IS NOT NULL) as deleted_rocks,
    (SELECT COUNT(*) FROM quarterly_priorities WHERE organization_id = o.id AND year = EXTRACT(YEAR FROM CURRENT_DATE) AND quarter = EXTRACT(QUARTER FROM CURRENT_DATE)) as current_quarter_rocks,
    (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as total_users,
    (SELECT COUNT(*) FROM teams WHERE organization_id = o.id) as total_teams
FROM org_info o;