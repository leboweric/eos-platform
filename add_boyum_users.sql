-- =====================================================
-- Add Users for Boyum Barenscheer Organization
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    becky_id UUID;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Organization ID: %', org_id;
    
    -- Check if Becky already exists
    SELECT id INTO becky_id
    FROM users
    WHERE organization_id = org_id
    AND LOWER(first_name) = 'becky'
    AND LOWER(last_name) = 'gibbs';
    
    IF becky_id IS NULL THEN
        -- Create Becky Gibbs
        INSERT INTO users (
            organization_id,
            first_name,
            last_name,
            email,
            role,
            password_hash,  -- This will need to be set properly for production
            created_at,
            updated_at
        ) VALUES (
            org_id,
            'Becky',
            'Gibbs',
            'becky.gibbs@boyumbarenscheer.com',  -- Update with actual email if different
            'member',  -- or 'admin' if she should be an admin
            '$2b$10$dummy.hash.for.migration',  -- Placeholder - she'll need to reset password
            NOW(),
            NOW()
        ) RETURNING id INTO becky_id;
        
        RAISE NOTICE 'Created Becky Gibbs with ID: %', becky_id;
        
        -- Add her to Leadership Team if needed
        INSERT INTO team_members (user_id, team_id, created_at)
        VALUES (
            becky_id,
            (SELECT id FROM teams WHERE organization_id = org_id AND name = 'Leadership Team'),
            NOW()
        );
        
        RAISE NOTICE 'Added Becky to Leadership Team';
    ELSE
        RAISE NOTICE 'Becky Gibbs already exists with ID: %', becky_id;
    END IF;
    
    -- You can add more users here following the same pattern
    -- Just copy the block above and change the names/emails
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User Creation Complete!';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify users were created
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    CASE 
        WHEN tm.user_id IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END as on_leadership_team
FROM users u
LEFT JOIN team_members tm ON tm.user_id = u.id 
    AND tm.team_id = (SELECT id FROM teams 
                      WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
                      AND name = 'Leadership Team')
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
ORDER BY u.first_name, u.last_name;