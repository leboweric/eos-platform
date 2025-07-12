-- Check consultant_organizations table
SELECT 
    co.consultant_user_id,
    co.organization_id,
    o.name as organization_name,
    u.email as consultant_email
FROM consultant_organizations co
JOIN organizations o ON co.organization_id = o.id
JOIN users u ON co.consultant_user_id = u.id
WHERE u.email = 'elebow@eosworldwide.com'
ORDER BY o.name;

-- Check if there's any data issue with organization IDs
SELECT id, name FROM organizations WHERE name LIKE '%Strategic%' OR name LIKE '%VITAL%';

-- Count users per organization
SELECT 
    o.id,
    o.name,
    COUNT(u.id) as user_count
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
WHERE o.id IN (
    SELECT organization_id 
    FROM consultant_organizations 
    WHERE consultant_user_id = (SELECT id FROM users WHERE email = 'elebow@eosworldwide.com')
)
GROUP BY o.id, o.name
ORDER BY o.name;