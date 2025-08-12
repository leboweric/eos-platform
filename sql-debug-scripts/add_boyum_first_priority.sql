-- =====================================================
-- Add First Company Priority for Boyum Barenscheer (Q3 2025)
-- =====================================================

-- Clear any failed transactions
ROLLBACK;

BEGIN;

DO $$
DECLARE
    org_id UUID;
    priority_id UUID;
    current_year INTEGER := 2025;
    current_quarter INTEGER := 3;  -- Q3
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Organization ID: %', org_id;
    
    -- Insert Company Priority
    INSERT INTO quarterly_priorities (
        organization_id,
        team_id,  -- Using special UUID for company priorities
        title,
        description,
        owner_id,  -- We'll need to set this to a Boyum user
        quarter,
        year,
        status,
        priority_type,
        progress,
        created_at,
        updated_at
    ) VALUES (
        org_id,
        '00000000-0000-0000-0000-000000000000'::uuid,  -- Leadership Team (Company priority)
        '$500K of new revenue from OB3',
        'Generate $500K of new revenue from OB3 Analysis offering',
        (SELECT id FROM users WHERE organization_id = org_id LIMIT 1),  -- First Boyum user as owner
        current_quarter,
        current_year,
        'on-track',
        'company',
        0,  -- Starting at 0% progress
        NOW(),
        NOW()
    ) RETURNING id INTO priority_id;
    
    RAISE NOTICE 'Created Priority ID: %', priority_id;
    
    -- Check if priority_milestones table exists and add milestones
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'priority_milestones'
    ) THEN
        -- Insert milestones with their due dates
        INSERT INTO priority_milestones (priority_id, milestone_text, due_date, is_completed, sort_order, created_at, updated_at)
        VALUES 
            (priority_id, 'Assign $25k/Partner', '2025-07-23'::DATE, false, 1, NOW(), NOW()),
            (priority_id, 'Karbon work items set up', '2025-07-25'::DATE, false, 2, NOW(), NOW()),
            (priority_id, 'Sell sheet for OB3 Analysis', '2025-07-28'::DATE, false, 3, NOW(), NOW()),
            (priority_id, 'Data Mining', '2025-07-31'::DATE, false, 4, NOW(), NOW()),
            (priority_id, 'Discussion points for firm growth meeting', '2025-08-01'::DATE, false, 5, NOW(), NOW()),
            (priority_id, 'Develop a recognition program', '2025-08-01'::DATE, false, 6, NOW(), NOW()),
            (priority_id, 'Contact Referral Sources (All)', '2025-08-08'::DATE, false, 7, NOW(), NOW()),
            (priority_id, 'Develop WIP Thermometer', '2025-08-12'::DATE, false, 8, NOW(), NOW()),
            (priority_id, 'Update Website', '2025-08-15'::DATE, false, 9, NOW(), NOW()),
            (priority_id, 'Training on how to sell the OB3', NULL, false, 10, NOW(), NOW());  -- No date specified
            
        RAISE NOTICE 'Added 10 milestones to the priority';
    ELSE
        RAISE NOTICE 'Note: priority_milestones table does not exist - milestones not added';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Company Priority Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Title: $500K of new revenue from OB3';
    RAISE NOTICE 'Quarter: Q3 2025';
    RAISE NOTICE 'Type: Company Priority';
    RAISE NOTICE 'Milestones: 10 (if table exists)';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the priority was added
SELECT 
    'PRIORITY' as check_type,
    p.id,
    p.title,
    p.quarter || ' ' || p.year as period,
    p.priority_type,
    p.status,
    u.first_name || ' ' || u.last_name as owner
FROM quarterly_priorities p
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.quarter = 3 
AND p.year = 2025
ORDER BY p.created_at DESC;

-- If milestones table exists, show them
SELECT 
    'MILESTONE' as check_type,
    pm.milestone_text,
    pm.due_date,
    pm.is_completed,
    pm.sort_order
FROM priority_milestones pm
JOIN quarterly_priorities p ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
ORDER BY pm.sort_order;