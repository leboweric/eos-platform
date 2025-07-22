-- Update admin@sentientwealth.com email to leboweric@gmail.com
-- This will change both the login email and where password reset emails are sent

-- Update the email address
UPDATE users 
SET email = 'leboweric@gmail.com'
WHERE email = 'admin@sentientwealth.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, organization_id 
FROM users 
WHERE email = 'leboweric@gmail.com';

-- After running this script:
-- 1. Login with: leboweric@gmail.com
-- 2. Password reset emails will go to: leboweric@gmail.com