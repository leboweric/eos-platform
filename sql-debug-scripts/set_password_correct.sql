-- Set password for admin@sentientwealth.com to 'abc123'
-- Using freshly generated bcryptjs hash

UPDATE users 
SET password = '$2a$10$lPUiRt3O5Hba0nAiGLPKQOtL.r30cXC8YllgbqxvpKASW0hHyq0Tu'
WHERE email = 'admin@sentientwealth.com';

-- Verify the update was successful
SELECT id, email, first_name, last_name, role, password
FROM users 
WHERE email = 'admin@sentientwealth.com';