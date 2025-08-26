-- Debug Script: Find Rocks/Priorities for Strategic Consulting and Coaching
-- Run this in pgAdmin to investigate missing data

-- 1. First, check what columns exist in organizations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'organizations'
ORDER BY ordinal_position;

-- 2. Find the Strategic Consulting organization
SELECT 
    id,
    name,
    created_at
FROM organizations 
WHERE LOWER(name) LIKE '%strategic%'
   OR LOWER(name) LIKE '%consulting%'
   OR LOWER(name) LIKE '%coaching%';

-- 3. Once you have the org ID from above, check their quarterly_priorities
-- REPLACE 'YOUR_ORG_ID_HERE' with the actual UUID from query #2
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
    qp.deleted_at
FROM quarterly_priorities qp
WHERE qp.organization_id = 'YOUR_ORG_ID_HERE'  -- <-- REPLACE THIS
ORDER BY qp.year DESC, qp.quarter DESC, qp.created_at DESC;

-- 4. Alternative: Check all orgs with "strategic" or "consulting" in name
SELECT 
    o.id as org_id,
    o.name as org_name,
    COUNT(qp.id) as total_rocks,
    SUM(CASE WHEN qp.deleted_at IS NULL THEN 1 ELSE 0 END) as active_rocks,
    SUM(CASE WHEN qp.deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_rocks
FROM organizations o
LEFT JOIN quarterly_priorities qp ON qp.organization_id = o.id
WHERE LOWER(o.name) LIKE '%strategic%'
   OR LOWER(o.name) LIKE '%consulting%'
   OR LOWER(o.name) LIKE '%coaching%'
GROUP BY o.id, o.name;

-- 5. Check if quarterly_priorities table has a deleted_at column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities'
AND column_name IN ('deleted_at', 'archived_at', 'is_deleted', 'is_archived', 'status')
ORDER BY ordinal_position;

-- 6. Get ALL quarterly priorities for orgs with strategic/consulting in name
SELECT 
    o.name as organization_name,
    qp.*
FROM quarterly_priorities qp
JOIN organizations o ON o.id = qp.organization_id
WHERE LOWER(o.name) LIKE '%strategic%'
   OR LOWER(o.name) LIKE '%consulting%'
   OR LOWER(o.name) LIKE '%coaching%'
ORDER BY o.name, qp.year DESC, qp.quarter DESC;

-- 7. Check current quarter (Q4 2024 or Q1 2025) specifically
SELECT 
    o.name as organization_name,
    COUNT(*) as rocks_count,
    qp.quarter,
    qp.year
FROM quarterly_priorities qp
JOIN organizations o ON o.id = qp.organization_id
WHERE (LOWER(o.name) LIKE '%strategic%'
   OR LOWER(o.name) LIKE '%consulting%'
   OR LOWER(o.name) LIKE '%coaching%')
   AND qp.year IN (2024, 2025)
   AND qp.quarter IN (4, 1)
GROUP lópoóópBY o.name, qp.quarter, qp.year
ORDER BY qp.year DESC, qp.quarter DESC;

-- 8. Check if there are ANY quarterly_priorities at all in the system
SELECT 
    COUNT(*) as total_priorities,
    COUNT(DISTINCT organization_id) as orgs_with_priorities,
    MIN(created_at) as oldest_priority,
    MAX(created_at) as newest_priority
FROM quarterly_priorities;

-- 9. List all organizations and their rock counts
SELECT 
    o.id,
    o.name,
    COUNT(qp.id) as rock_count,
    MAX(qp.created_at) as last_rock_created
FROM organizations o
LEFT JOIN quarterly_priorities qp ON qp.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

-- 10. If Strategic Consulting exists, check all related data
-- REPLACE 'YOUR_ORG_ID_HERE' with actual org ID from query #2
WITH org_data AS (
    SELECT id FROM organizations 
    WHERE LOWER(name) LIKE '%strategic%' 
    LIMIT 1
)
SELECT 
    'Quarterly Priorities' as table_name,
    COUNT(*) as count
FROM quarterly_priorities 
WHERE organization_id IN (SELECT id FROM org_data)
UNION ALL
SELECT 
    'Teams' as table_name,
    COUNT(*) as count
FROM teams 
WHERE organization_id IN (SELECT id FROM org_data)
UNION ALL
SELECT 
    'Users' as table_name,
    COUNT(*) as count
FROM users 
WHERE organization_id IN (SELECT id FROM org_data)
UNION ALL
SELECT 
    'Departments' as table_name,
    COUNT(*) as count
FROM departments 
WHERE organization_id IN (SELECT id FROM org_data);

-- 11. Debug: Show the actual structure of quarterly_priorities
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities'
ORDER BY ordinal_position;