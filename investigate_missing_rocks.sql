-- Investigate why Strategic Consulting & Coaching has no rocks

-- 1. Confirm they really have ZERO rocks
SELECT 
    'Strategic Consulting & Coaching' as org_name,
    COUNT(*) as total_rocks
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 2. Check if they have ANY data in related tables
SELECT 
    'Users' as data_type, COUNT(*) as count
FROM users WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
UNION ALL
SELECT 
    'Teams' as data_type, COUNT(*) as count
FROM teams WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
UNION ALL
SELECT 
    'Departments' as data_type, COUNT(*) as count
FROM departments WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
UNION ALL
SELECT 
    'Issues' as data_type, COUNT(*) as count
FROM issues WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
UNION ALL
SELECT 
    'Todos' as data_type, COUNT(*) as count
FROM todos WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
UNION ALL
SELECT 
    'Scorecard Metrics' as data_type, COUNT(*) as count
FROM scorecard_metrics WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 3. Check if this is a new org (created recently)
SELECT 
    name,
    created_at,
    AGE(NOW(), created_at) as age
FROM organizations
WHERE id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';

-- 4. Check other organizations to see if they have rocks
SELECT 
    o.name,
    COUNT(qp.id) as rock_count
FROM organizations o
LEFT JOIN quarterly_priorities qp ON qp.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY COUNT(qp.id) DESC;

-- 5. Create sample rocks for Strategic Consulting & Coaching
-- ONLY RUN THIS IF YOU WANT TO ADD TEST DATA
/*
INSERT INTO quarterly_priorities (
    id,
    organization_id,
    title,
    description,
    quarter,
    year,
    status,
    progress,
    created_at,
    updated_at
) VALUES 
(
    gen_random_uuid(),
    'e2f66db4-ded7-4be9-b79c-e8749c8dbd89',
    'Complete Client Onboarding Process',
    'Develop and document standardized onboarding for new consulting clients',
    1,
    2025,
    'on-track',
    30,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'e2f66db4-ded7-4be9-b79c-e8749c8dbd89',
    'Launch New Service Offering',
    'Design and launch strategic planning workshop package',
    1,
    2025,
    'on-track',
    15,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'e2f66db4-ded7-4be9-b79c-e8749c8dbd89',
    'Build Partner Network',
    'Establish partnerships with 3 complementary service providers',
    1,
    2025,
    'on-track',
    0,
    NOW(),
    NOW()
);
*/

-- 6. Check if maybe someone tried to migrate them to universal_objectives
SELECT 
    COUNT(*) as universal_count
FROM universal_objectives
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';