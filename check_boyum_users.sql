-- =====================================================
-- Check Users in Boyum Barenscheer Organization
-- =====================================================

-- List all users in Boyum organization
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.created_at
FROM users u
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
ORDER BY u.first_name, u.last_name;

-- Check specifically for Becky Gibbs
SELECT 
    'BECKY CHECK' as check_type,
    u.id as user_id,
    u.first_name || ' ' || u.last_name as full_name,
    u.email
FROM users u
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND LOWER(u.first_name) = 'becky' 
AND LOWER(u.last_name) = 'gibbs';

-- If Becky doesn't exist, we'll need to create her
-- This query will show if we need to add her
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'Need to create Becky Gibbs user'
        ELSE 'Becky Gibbs exists with ID: ' || (SELECT id::text FROM users 
                                                  WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
                                                  AND LOWER(first_name) = 'becky' 
                                                  AND LOWER(last_name) = 'gibbs' 
                                                  LIMIT 1)
    END as status
FROM users
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND LOWER(first_name) = 'becky' 
AND LOWER(last_name) = 'gibbs';