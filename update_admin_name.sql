-- Update the admin user's name from 'Sentient' to the actual name
-- Run this in pgAdmin

-- First, let's see the current user details
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'admin@sentientwealth.com';

-- Update the first and last name
-- Replace 'Eric' and 'LeBow' with your actual first and last name
UPDATE users 
SET 
    first_name = 'Eric',
    last_name = 'LeBow',
    updated_at = NOW()
WHERE email = 'admin@sentientwealth.com';

-- Verify the update
SELECT id, email, first_name, last_name, role 
FROM users 
WHERE email = 'admin@sentientwealth.com';

-- You can also update the mattm user if needed
-- UPDATE users 
-- SET 
--     first_name = 'Matt',
--     last_name = 'M',
--     updated_at = NOW()
-- WHERE email = 'mattm@sentientwealth.com';