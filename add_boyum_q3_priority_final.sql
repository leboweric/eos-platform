-- =====================================================
-- Add Q3 2025 Company Priority with Milestones for Boyum
-- Using correct column names from actual database schema
-- =====================================================

-- Clear any failed transactions
ROLLBACK;

BEGIN;

DO $$
DECLARE
    org_id UUID;
    boyum_leadership_id UUID;
    priority_id UUID;
    current_year INTEGER := 2025;
    current_quarter VARCHAR := 'Q3';
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Organization ID: %', org_id;
    
    -- Get Boyum's Leadership Team ID (NOT the special UUID)
    SELECT id INTO boyum_leadership_id
    FROM teams
    WHERE organization_id = org_id
    AND name = 'Leadership Team';
    
    IF boyum_leadership_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Leadership Team not found';
    END IF;
    
    RAISE NOTICE 'Found Boyum Leadership Team ID: %', boyum_leadership_id;
    
    -- Check if this priority already exists
    SELECT id INTO priority_id
    FROM quarterly_priorities
    WHERE organization_id = org_id
    AND title = '$500K of new revenue from OB3'
    AND quarter = current_quarter
    AND year = current_year;
    
    IF priority_id IS NOT NULL THEN
        RAISE NOTICE 'Priority already exists with ID: %, deleting to recreate...', priority_id;
        -- Delete existing milestones and priority to recreate
        DELETE FROM priority_milestones WHERE priority_id = priority_id;
        DELETE FROM quarterly_priorities WHERE id = priority_id;
    END IF;
    
    -- Insert Company Priority (using Boyum's actual Leadership Team ID)
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
        boyum_leadership_id,  -- Use Boyum's actual Leadership Team ID
        '$500K of new revenue from OB3',
        'Generate $500K of new revenue from OB3 Analysis offering',
        (SELECT id FROM users WHERE organization_id = org_id LIMIT 1),
        current_quarter,
        current_year,
        '2025-09-30'::DATE,  -- End of Q3 2025
        'on-track',
        true,
        true,
        0,
        NOW(),
        NOW()
    ) RETURNING id INTO priority_id;
    
    RAISE NOTICE 'Created new Priority ID: %', priority_id;
    
    -- Insert milestones using the correct column names
    -- The columns are: priority_id, title (not milestone_text), due_date, completed (not is_completed)
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), priority_id, 'Assign $25k/Partner', '2025-07-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Karbon work items set up', '2025-07-25'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Sell sheet for OB3 Analysis', '2025-07-28'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Data Mining', '2025-07-31'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Discussion points for firm growth meeting', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Develop a recognition program', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Contact Referral Sources (All)', '2025-08-08'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Develop WIP Thermometer', '2025-08-12'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Update Website', '2025-08-15'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Training on how to sell the OB3', '2025-08-31'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority and Milestones Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority: $500K of new revenue from OB3';
    RAISE NOTICE 'Quarter: Q3 2025';
    RAISE NOTICE 'Team: Boyum Leadership Team';
    RAISE NOTICE 'Milestones: 10';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify everything was added
SELECT 
    'PRIORITY CHECK' as type,
    p.id,
    p.title,
    p.quarter || ' ' || p.year as period,
    p.is_company_priority,
    t.name as team_name,
    COUNT(pm.priority_id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
GROUP BY p.id, p.title, p.quarter, p.year, p.is_company_priority, t.name;

-- Show the milestones
SELECT 
    pm.title as milestone,
    pm.due_date,
    pm.completed,
    pm.created_at
FROM priority_milestones pm
JOIN quarterly_priorities p ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
ORDER BY pm.due_date;