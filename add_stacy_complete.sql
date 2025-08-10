-- =====================================================
-- Add Stacy Shaw and Her Individual Priorities for Q3 2025
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    stacy_id UUID;
    leadership_team_id UUID;
    p1_id UUID;
    p2_id UUID;
    p3_id UUID;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    -- Get Leadership Team ID
    SELECT id INTO leadership_team_id
    FROM teams
    WHERE organization_id = org_id
    AND name = 'Leadership Team';
    
    -- Check if Stacy exists, create if not
    SELECT id INTO stacy_id
    FROM users
    WHERE organization_id = org_id
    AND LOWER(first_name) = 'stacy'
    AND LOWER(last_name) = 'shaw';
    
    IF stacy_id IS NULL THEN
        -- Create Stacy Shaw
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
            'Stacy',
            'Shaw',
            'sshaw@myboyum.com',
            'member',
            '$2b$10$dummy.hash.for.migration',
            NOW(),
            NOW()
        ) RETURNING id INTO stacy_id;
        
        RAISE NOTICE 'Created Stacy Shaw with ID: %', stacy_id;
        
        -- Add to Leadership Team
        INSERT INTO team_members (user_id, team_id)
        VALUES (stacy_id, leadership_team_id)
        ON CONFLICT (user_id, team_id) DO NOTHING;
        
        RAISE NOTICE 'Added Stacy to Leadership Team';
    ELSE
        RAISE NOTICE 'Stacy Shaw already exists with ID: %', stacy_id;
    END IF;
    
    -- Priority 1: Define profile of ideal CAS targets
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
        leadership_team_id,
        'Define profile of ideal CAS targets',
        'Establish criteria and strategy for Client Accounting Services acquisition targets',
        stacy_id,
        'Q3',
        2025,
        '2025-09-30'::DATE,
        'on-track',
        false,  -- Individual priority
        false,
        0,
        NOW(),
        NOW()
    ) RETURNING id INTO p1_id;
    
    -- Add milestones for Priority 1
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), p1_id, 'Put together draft of parameters as well as pros/cons', '2025-08-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p1_id, 'Go over with Charlie', '2025-09-19'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p1_id, 'Get listing of bookkeepers/controllers we all work with', '2025-10-16'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p1_id, 'Decide if we want to organically meet with and try to merge or use broker', '2025-11-19'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE 'Created Priority 1 with 4 milestones';
    
    -- Priority 2: Create Business Development plans/templates for team
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
        leadership_team_id,
        'Create Business Development plans/templates for team',
        'Develop comprehensive BD plans and templates for team use',
        stacy_id,
        'Q3',
        2025,
        '2025-09-30'::DATE,
        'on-track',
        false,  -- Individual priority
        false,
        0,
        NOW(),
        NOW()
    ) RETURNING id INTO p2_id;
    
    -- Add milestones for Priority 2
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), p2_id, 'Invite Patty to Quarterly L10 so she is up to speed on what we are focusing on', '2025-07-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p2_id, 'Barb, Nick and Stacy to meet with Patty', '2025-08-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p2_id, 'Formalize BD Plans and go over in BAS L10 to approve', '2025-09-19'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p2_id, 'Bring plans to Leadership L10 for approval', '2025-09-22'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p2_id, 'Adjust, as necessary, and finalize plans', '2025-09-24'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE 'Created Priority 2 with 5 milestones';
    
    -- Priority 3: Training on how to sell the OB3
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
        leadership_team_id,
        'Training on how to sell the OB3',
        'Develop and deliver OB3 sales training for all staff',
        stacy_id,
        'Q3',
        2025,
        '2025-09-30'::DATE,
        'on-track',
        false,  -- Individual priority
        false,
        0,
        NOW(),
        NOW()
    ) RETURNING id INTO p3_id;
    
    -- Add milestones for Priority 3
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), p3_id, 'Get bill manager training final document from Chris', '2025-07-31'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p3_id, 'Get OB3 write up - sell sheet - from Chris', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p3_id, 'Prepare for and have training with all staff', '2025-08-08'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE 'Created Priority 3 with 3 milestones';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Stacy Shaw Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'User: Stacy Shaw (sshaw@myboyum.com)';
    RAISE NOTICE 'Priority 1: Define CAS targets (4 milestones)';
    RAISE NOTICE 'Priority 2: BD plans/templates (5 milestones)';
    RAISE NOTICE 'Priority 3: OB3 training (3 milestones)';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify Stacy's priorities were added
SELECT 
    'STACY PRIORITIES' as check_type,
    p.title,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.owner_id = (
    SELECT id FROM users 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
    AND LOWER(first_name) = 'stacy' 
    AND LOWER(last_name) = 'shaw'
)
AND p.quarter = 'Q3'
AND p.year = 2025
GROUP BY p.id, p.title
ORDER BY p.created_at;

-- Show summary of all individual priorities for Boyum Q3 2025
SELECT 
    'INDIVIDUAL SUMMARY' as check_type,
    u.first_name || ' ' || u.last_name as owner,
    COUNT(DISTINCT p.id) as priority_count,
    COUNT(pm.id) as total_milestones
FROM quarterly_priorities p
LEFT JOIN users u ON p.owner_id = u.id
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.quarter = 'Q3'
AND p.year = 2025
AND p.is_company_priority = false
GROUP BY u.id, u.first_name, u.last_name
ORDER BY u.first_name;