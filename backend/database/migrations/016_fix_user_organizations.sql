-- Fix user organization associations
-- First, let's see what organizations exist
SELECT id, name FROM organizations;

-- Check all users and their organizations
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.organization_id,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
ORDER BY u.email;

-- Update users to the correct organization if needed
-- Replace the IDs below with the correct values from your database
-- UPDATE users 
-- SET organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
-- WHERE email IN ('kharding@strategic-cc.com', 'your-other-user@email.com');

-- Verify the updates
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    u.organization_id,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
ORDER BY u.email;