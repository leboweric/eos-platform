-- =====================================================
-- Complete Script: Add Becky Gibbs and Add to Leadership Team
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    becky_id UUID;
    leadership_team_id UUID;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Organization ID: %', org_id;
    
    -- Get Leadership Team ID
    SELECT id INTO leadership_team_id
    FROM teams
    WHERE organization_id = org_id
    AND name = 'Leadership Team';
    
    IF leadership_team_id IS NULL THEN
        RAISE EXCEPTION 'Leadership Team not found for Boyum';
    END IF;
    
    RAISE NOTICE 'Found Leadership Team ID: %', leadership_team_id;
    
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
            password_hash,
            created_at,
            updated_at
        ) VALUES (
            org_id,
            'Becky',
            'Gibbs',
            'bgibbs@boyumbarenscheer.com',
            'member',
            '$2b$10$dummy.hash.for.migration',  -- She'll need to reset password
            NOW(),
            NOW()
        ) RETURNING id INTO becky_id;
        
        RAISE NOTICE 'Created Becky Gibbs with ID: %', becky_id;
    ELSE
        RAISE NOTICE 'Becky Gibbs already exists with ID: %', becky_id;
    END IF;
    
    -- Add her to Leadership Team (without created_at since column doesn't exist)
    INSERT INTO team_members (user_id, team_id)
    VALUES (becky_id, leadership_team_id)
    ON CONFLICT (user_id, team_id) DO NOTHING;
    
    RAISE NOTICE 'Added Becky to Leadership Team';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Becky Gibbs Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User ID: %', becky_id;
    RAISE NOTICE 'Email: bgibbs@boyumbarenscheer.com';
    RAISE NOTICE 'Team: Leadership Team';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify Becky was created and added to team
SELECT 
    'USER CHECK' as check_type,
    u.id as user_id,
    u.first_name || ' ' || u.last_name as full_name,
    u.email,
    u.role,
    t.name as team_name
FROM users u
LEFT JOIN team_members tm ON tm.user_id = u.id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND LOWER(u.first_name) = 'becky'
AND LOWER(u.last_name) = 'gibbs';

-- Show all Leadership Team members for Boyum
SELECT 
    'TEAM MEMBERS' as check_type,
    u.first_name || ' ' || u.last_name as member_name,
    u.email
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND t.name = 'Leadership Team'
ORDER BY u.first_name, u.last_name;