-- =====================================================
-- Add Becky Gibbs' Individual Priorities for Q3 2025
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    becky_id UUID;
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
    
    -- Get Becky's user ID
    SELECT id INTO becky_id
    FROM users
    WHERE organization_id = org_id
    AND LOWER(first_name) = 'becky'
    AND LOWER(last_name) = 'gibbs';
    
    IF becky_id IS NULL THEN
        RAISE EXCEPTION 'Becky Gibbs not found - please create her first';
    END IF;
    
    RAISE NOTICE 'Found Becky Gibbs with ID: %', becky_id;
    
    -- Get Leadership Team ID
    SELECT id INTO leadership_team_id
    FROM teams
    WHERE organization_id = org_id
    AND name = 'Leadership Team';
    
    -- Priority 1: Create Business Development plans/templates for team
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
        becky_id,
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
        (gen_random_uuid(), p1_id, 'Invite Patty to quarterly L10', '2025-07-30'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p1_id, 'Pat, Jake, Ashley, Anna, Becky to meet with Patty monthly', '2025-08-15'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p1_id, 'Formalize BD plans and discuss at L10', '2025-08-31'::DATE, false, NOW(), NOW());
    
    RAISE NOTICE 'Created Priority 1 with ID: % and 3 milestones', p1_id;
    
    -- Priority 2: Deliver IFA Webinar (no milestones)
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
        'Deliver IFA Webinar',
        'Prepare and deliver webinar for IFA',
        becky_id,
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
    
    RAISE NOTICE 'Created Priority 2 with ID: % (no milestones)', p2_id;
    
    -- Priority 3: Develop draft of revamped Non-Profit strategy (no milestones)
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
        'Develop draft of revamped Non-Profit strategy',
        'Create comprehensive strategy for non-profit client services',
        becky_id,
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
    
    RAISE NOTICE 'Created Priority 3 with ID: % (no milestones)', p3_id;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Becky Gibbs Priorities Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Priority 1: BD plans/templates (3 milestones)';
    RAISE NOTICE 'Priority 2: IFA Webinar (no milestones)';
    RAISE NOTICE 'Priority 3: Non-Profit strategy (no milestones)';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify Becky's priorities were added
SELECT 
    'BECKY PRIORITIES' as check_type,
    p.title,
    p.quarter || ' ' || p.year as period,
    p.is_company_priority,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.owner_id = (
    SELECT id FROM users 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
    AND LOWER(first_name) = 'becky' 
    AND LOWER(last_name) = 'gibbs'
)
AND p.quarter = 'Q3'
AND p.year = 2025
GROUP BY p.id, p.title, p.quarter, p.year, p.is_company_priority
ORDER BY p.created_at;

-- Show all Q3 2025 priorities summary for Boyum
SELECT 
    'OVERALL SUMMARY' as check_type,
    CASE 
        WHEN p.is_company_priority THEN 'Company'
        ELSE u.first_name || ' ' || u.last_name
    END as owner,
    LEFT(p.title, 50) as title,
    COUNT(pm.id) as milestones
FROM quarterly_priorities p
LEFT JOIN users u ON p.owner_id = u.id
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.quarter = 'Q3'
AND p.year = 2025
GROUP BY p.id, p.title, p.is_company_priority, u.first_name, u.last_name
ORDER BY p.is_company_priority DESC, u.first_name;