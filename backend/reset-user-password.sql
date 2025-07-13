-- Reset password for elebow@bmhmn.com to 'abc123'
-- The bcrypt hash below is for the password 'abc123'

UPDATE users 
SET password_hash = '$2a$12$K3WlyKSlKQqwLjYYNpOdPuTJz5Xs4eFvCXNlYIQwP.E29c0J7JQKi'
WHERE email = 'elebow@bmhmn.com';

-- Verify the update
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    organization_id
FROM users 
WHERE email = 'elebow@bmhmn.com';

-- Also check if there are multiple users with similar emails
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    organization_id,
    created_at
FROM users 
WHERE email LIKE '%elebow%' OR email LIKE '%bmhmn%'
ORDER BY created_at DESC;