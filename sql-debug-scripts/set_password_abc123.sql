-- Set password for admin@sentientwealth.com to 'abc123'
-- This bcrypt hash is for the password 'abc123'

UPDATE users 
SET password = '$2b$10$nPHpPFwDPzl3KgvotVqiM.bGYPoMiJz9Hm6dQoEjT0wHSqnJM5MSu'
WHERE email = 'admin@sentientwealth.com';

-- Verify the update was successful
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'admin@sentientwealth.com';