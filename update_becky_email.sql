-- =====================================================
-- Update Becky Gibbs Email Address
-- =====================================================

BEGIN;

-- Update Becky's email
UPDATE users
SET email = 'bgibbs@myboyum.com',
    updated_at = NOW()
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND LOWER(first_name) = 'becky'
AND LOWER(last_name) = 'gibbs';

COMMIT;

-- Verify the update
SELECT 
    id as user_id,
    first_name || ' ' || last_name as full_name,
    email,
    role
FROM users
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND LOWER(first_name) = 'becky'
AND LOWER(last_name) = 'gibbs';