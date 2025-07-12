-- First, let's find all records for Krista Harding
-- This will show us where she exists in the database
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    organization_id,
    created_at,
    deleted_at
FROM users 
WHERE email = 'kharding@strategic-cc.com';

-- If she exists but has deleted_at set (soft deleted), we can hard delete her:
-- DELETE FROM users WHERE email = 'kharding@strategic-cc.com';

-- Or if you want to just update her to allow re-creation:
-- UPDATE users SET email = CONCAT('deleted_', id, '_', email), deleted_at = NOW() 
-- WHERE email = 'kharding@strategic-cc.com' AND deleted_at IS NULL;