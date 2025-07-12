-- Debug query to check user organization associations
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.organization_id,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
ORDER BY u.email;

-- Check which organization IDs exist
SELECT DISTINCT 
    organization_id,
    COUNT(*) as user_count
FROM users
GROUP BY organization_id;

-- Check if there are any users for the specific org
SELECT * FROM users 
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89';