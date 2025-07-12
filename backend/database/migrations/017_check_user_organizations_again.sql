-- Check current user organization associations
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.organization_id,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email IN ('cjensen@strategic-cc.com', 'kharding@strategic-cc.com', 'roanderson@strategic-cc.com')
ORDER BY u.email;

-- If they're in the wrong organization, update them to Strategic Consulting & Coaching
-- UPDATE users 
-- SET organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
-- WHERE email IN ('cjensen@strategic-cc.com', 'kharding@strategic-cc.com', 'roanderson@strategic-cc.com');