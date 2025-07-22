-- First, check if the user exists
SELECT id, email, first_name, last_name, organization_id 
FROM users 
WHERE email = 'mattm@sentientwealth.com';

-- If the user exists, update the password
-- If not, you'll need to create the user first
UPDATE users
SET password_hash = '$2a$10$lPUiRt3O5Hba0nAiGLPKQOtL.r30cXC8YllgbqxvpKASW0hHyq0Tu'
WHERE email = 'mattm@sentientwealth.com';

-- Verify the update
SELECT email, password_hash 
FROM users 
WHERE email = 'mattm@sentientwealth.com';

-- If the user doesn't exist, you can create them with:
/*
INSERT INTO users (id, email, password_hash, first_name, last_name, organization_id, role, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'mattm@sentientwealth.com',
    '$2a$10$lPUiRt3O5Hba0nAiGLPKQOtL.r30cXC8YllgbqxvpKASW0hHyq0Tu',
    'Matt',
    'M',
    (SELECT id FROM organizations WHERE slug = 'sentient-wealth'),
    'user',
    true,
    NOW(),
    NOW()
);
*/