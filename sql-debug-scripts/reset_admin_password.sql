-- Reset password for admin@sentientwealth.com
-- New password will be: TempPass123!
-- 
-- IMPORTANT: Change this password immediately after logging in

UPDATE users 
SET password = '$2b$10$8KqG5P3aB.FFx7YH0W6Xzupf.rlWY2h9KJgGfRX5VQxR2SZLYJWnO'
WHERE email = 'admin@sentientwealth.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, organization_id 
FROM users 
WHERE email = 'admin@sentientwealth.com';