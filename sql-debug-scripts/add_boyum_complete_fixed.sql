-- =====================================================
-- Complete Script: Add Q3 2025 Priority with Milestones for Boyum
-- Handles all cases: creates priority if needed, adds milestones
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
    AND title = '$500K of new revenue from OB3'
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
            '$500K of new revenue from OB3',
            'Generate $500K of new revenue from OB3 Analysis offering',
            (SELECT id FROM users WHERE organization_id = org_id LIMIT 1),
            'Q3',
            2025,
            '2025-09-30'::DATE,
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
        (gen_random_uuid(), p_id, 'Assign $25k/Partner', '2025-07-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Karbon work items set up', '2025-07-25'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Sell sheet for OB3 Analysis', '2025-07-28'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Data Mining', '2025-07-31'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Discussion points for firm growth meeting', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Develop a recognition program', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Contact Referral Sources (All)', '2025-08-08'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Develop WIP Thermometer', '2025-08-12'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Update Website', '2025-08-15'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Training on how to sell the OB3', '2025-08-31'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority and Milestones Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority ID: %', p_id;
    RAISE NOTICE 'Title: $500K of new revenue from OB3';
    RAISE NOTICE 'Quarter: Q3 2025';
    RAISE NOTICE 'Milestones: 10';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify everything was added
SELECT 
    'PRIORITY' as type,
    p.id,
    p.title,
    p.quarter || ' ' || p.year as period,
    p.is_company_priority,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
GROUP BY p.id, p.title, p.quarter, p.year, p.is_company_priority;

-- Show the milestones
SELECT 
    pm.title as milestone,
    pm.due_date,
    pm.completed
FROM priority_milestones pm
JOIN quarterly_priorities p ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
ORDER BY pm.due_date;