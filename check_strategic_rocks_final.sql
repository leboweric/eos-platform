-- Check Strategic Consulting & Coaching's Rocks

-- 1. Get their exact org ID
SELECT 
    id,
    name,
    created_at
FROM organizations
WHERE id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 2. Check ALL their quarterly_priorities (Rocks)
SELECT 
    qp.id,
    qp.title,
    qp.description,
    qp.quarter,
    qp.year,
    qp.status,
    qp.progress,
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
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
ORDER BY qp.year DESC, qp.quarter DESC, qp.created_at DESC;

-- 3. Count summary
SELECT 
    COUNT(*) as total_rocks,
    SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active_rocks,
    SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_rocks,
    SUM(CASE WHEN year = 2024 AND quarter = 4 THEN 1 ELSE 0 END) as q4_2024_rocks,
    SUM(CASE WHEN year = 2025 AND quarter = 1 THEN 1 ELSE 0 END) as q1_2025_rocks
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 4. Check current quarter specifically
SELECT 
    qp.*
FROM quarterly_priorities qp
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND qp.year = 2025
    AND qp.quarter = 1
    AND qp.deleted_at IS NULL;

-- 5. Check if they have users who could own rocks
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.email
FROM users u
WHERE u.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 6. Check if they have teams
SELECT 
    t.id,
    t.name,
    t.is_leadership_team
FROM teams t
WHERE t.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 7. Check recent activity - maybe rocks were recently deleted?
SELECT 
    qp.title,
    qp.deleted_at,
    qp.updated_at,
    qp.status
FROM quarterly_priorities qp
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND (qp.deleted_at > '2024-12-01' OR qp.updated_at > '2024-12-01')
ORDER BY COALESCE(qp.deleted_at, qp.updated_at) DESC;