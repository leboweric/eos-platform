-- =====================================================
-- Add Third Q3 2025 Priority with Milestones for Boyum
-- Priority: Define profile of ideal CAS targets
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    p_id UUID;
    boyum_team_id UUID;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Organization ID: %', org_id;
    
    -- Get Boyum's Leadership Team ID
    SELECT id INTO boyum_team_id
    FROM teams
    WHERE organization_id = org_id
    AND name = 'Leadership Team';
    
    IF boyum_team_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Leadership Team not found';
    END IF;
    
    RAISE NOTICE 'Found Boyum Leadership Team ID: %', boyum_team_id;
    
    -- Check if priority already exists
    SELECT id INTO p_id
    FROM quarterly_priorities
    WHERE organization_id = org_id
    AND title = 'Define profile of ideal CAS targets'
    AND quarter = 'Q3'
    AND year = 2025;
    
    IF p_id IS NOT NULL THEN
        RAISE NOTICE 'Priority already exists with ID: %', p_id;
        -- Delete existing milestones to replace them
        DELETE FROM priority_milestones WHERE priority_id = p_id;
    ELSE
        -- Create the priority
        INSERT INTO quarterly_priorities (
            organization_id,
            team_id,
            title,
            description,
            owner_id,
            quarter,
            year,
            due_date,
            status,
            is_company_priority,
            is_company_rock,
            progress,
            created_at,
            updated_at
        ) VALUES (
            org_id,
            boyum_team_id,
            'Define profile of ideal CAS targets',
            'Establish criteria and strategy for Client Accounting Services acquisition targets',
            (SELECT id FROM users WHERE organization_id = org_id LIMIT 1),
            'Q3',
            2025,
            '2025-09-30'::DATE,  -- End of Q3
            'on-track',
            true,
            true,
            0,
            NOW(),
            NOW()
        ) RETURNING id INTO p_id;
        
        RAISE NOTICE 'Created new Priority with ID: %', p_id;
    END IF;
    
    -- Now add the milestones
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), p_id, 'Put together draft of parameters as well as pros/cons', '2025-08-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Go over with Charlie', '2025-09-19'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Get listing of bookkeepers/controllers we all work with', '2025-10-16'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Decide if we want to organically meet with and try to merge or use broker', '2025-11-19'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority and Milestones Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority ID: %', p_id;
    RAISE NOTICE 'Title: Define profile of ideal CAS targets';
    RAISE NOTICE 'Quarter: Q3 2025';
    RAISE NOTICE 'Milestones: 4';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify everything was added
SELECT 
    'PRIORITY' as type,
    p.id,
    LEFT(p.title, 50) as title,
    p.quarter || ' ' || p.year as period,
    p.is_company_priority,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = 'Define profile of ideal CAS targets'
GROUP BY p.id, p.title, p.quarter, p.year, p.is_company_priority;

-- Show the milestones
SELECT 
    pm.title as milestone,
    pm.due_date,
    pm.completed
FROM priority_milestones pm
JOIN quarterly_priorities p ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = 'Define profile of ideal CAS targets'
ORDER BY pm.due_date;

-- Show all Boyum Q3 2025 priorities summary
SELECT 
    'SUMMARY' as type,
    LEFT(p.title, 60) as title,
    COUNT(pm.id) as milestones
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.quarter = 'Q3'
AND p.year = 2025
GROUP BY p.id, p.title
ORDER BY p.created_at;