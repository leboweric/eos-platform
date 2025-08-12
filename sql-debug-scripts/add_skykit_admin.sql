-- Add admin@skykit.com to Skykit organization
-- Password will be: abc123

-- First, check if Skykit organization exists and get its ID
SELECT id, name FROM organizations WHERE name = 'Skykit' OR slug = 'skykit';

-- If Skykit organization exists, run this to create the admin user:
INSERT INTO users (
    id,
    email, 
    password_hash, 
    first_name, 
    last_name, 
    organization_id, 
    role,
    created_at, 
    updated_at
)
VALUES (
    gen_random_uuid(),
    'admin@skykit.com',
    '$2a$10$lPUiRt3O5Hba0nAiGLPKQOtL.r30cXC8YllgbqxvpKASW0hHyq0Tu',
    'Admin',
    'User',
    (SELECT id FROM organizations WHERE name = 'Skykit' OR slug = 'skykit' LIMIT 1),
    'admin',
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT u.id, u.email, u.first_name, u.last_name, u.role, o.name as organization 
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'admin@skykit.com';