-- =====================================================
-- Add 1-Year Plan for Boyum Barenscheer
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    blueprint_id UUID;
    one_year_plan_id UUID;
    goals_array TEXT;
BEGIN
    -- Get the organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    -- Get the business blueprint (with team_id = NULL for org-level)
    SELECT id INTO blueprint_id
    FROM business_blueprints 
    WHERE organization_id = org_id 
    AND team_id IS NULL;  -- CRITICAL: Must be NULL for org-level
    
    IF blueprint_id IS NULL THEN
        RAISE EXCEPTION 'Business Blueprint not found. Run core values script first.';
    END IF;
    
    -- Build the goals as a JSON array
    goals_array := '[
        "Average of 50 Hours per Week for Staff During Busy Season",
        "Change 25% of Clients under 70% of realization",
        "Staff up budgeting process for billable hours with revenue goal",
        "Implement EOS in Leadership Team, BAS, Tax, A&A, HR, IT, Marketing (top levels)",
        "Succession Plan Drafts in place for JT, TH, RF",
        "Career Coaching Plan in Place for Partners to career coach Managers",
        "Karbon fully implemented",
        "Create Phase 2 of career coaching plan for staff"
    ]';

    -- Check if 1-year plan already exists for this specific blueprint
    IF EXISTS (SELECT 1 FROM one_year_plans WHERE vto_id = blueprint_id) THEN
        RAISE NOTICE 'WARNING: 1-Year Plan already exists for this blueprint!';
        RAISE NOTICE 'To update, manually delete the existing one first';
        RAISE EXCEPTION 'Stopping to prevent data loss - 1-Year Plan already exists';
    END IF;
    
    -- Insert 1-Year Plan
    INSERT INTO one_year_plans (
        vto_id,  -- Still named vto_id even though it references business_blueprints
        future_date,
        revenue_target,
        profit_target,
        goals,  -- Store goals as JSON array
        created_at,
        updated_at
    ) VALUES (
        blueprint_id,
        '2025-12-31'::DATE,
        28200000,  -- $28.2M total revenue (26.7M BB + 1.5M WM)
        NULL,  -- Profit not specified
        goals_array,
        NOW(),
        NOW()
    ) RETURNING id INTO one_year_plan_id;
    
    -- Add individual goals to one_year_goals table if it exists
    -- Check if the one_year_goals table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'one_year_goals'
    ) THEN
        -- Insert individual goals with sort order
        INSERT INTO one_year_goals (one_year_plan_id, goal_text, sort_order, created_at, updated_at)
        VALUES 
            (one_year_plan_id, 'Average of 50 Hours per Week for Staff During Busy Season', 1, NOW(), NOW()),
            (one_year_plan_id, 'Change 25% of Clients under 70% of realization', 2, NOW(), NOW()),
            (one_year_plan_id, 'Staff up budgeting process for billable hours with revenue goal', 3, NOW(), NOW()),
            (one_year_plan_id, 'Implement EOS in Leadership Team, BAS, Tax, A&A, HR, IT, Marketing (top levels)', 4, NOW(), NOW()),
            (one_year_plan_id, 'Succession Plan Drafts in place for JT, TH, RF', 5, NOW(), NOW()),
            (one_year_plan_id, 'Career Coaching Plan in Place for Partners to career coach Managers', 6, NOW(), NOW()),
            (one_year_plan_id, 'Karbon fully implemented', 7, NOW(), NOW()),
            (one_year_plan_id, 'Create Phase 2 of career coaching plan for staff', 8, NOW(), NOW());
            
        RAISE NOTICE 'Added 8 individual goals to one_year_goals table';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '1-Year Plan Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Future Date: December 31, 2025';
    RAISE NOTICE 'Revenue Target: $28.2M ($26.7M BB + $1.5M WM)';
    RAISE NOTICE 'Goals: 8 key initiatives for the year';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the 1-year plan was added
SELECT 
    oyp.future_date,
    oyp.revenue_target,
    oyp.profit_target,
    SUBSTRING(oyp.goals, 1, 100) || '...' as goals_preview,
    bb.name as blueprint_name,
    o.name as org_name
FROM one_year_plans oyp
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- If one_year_goals table exists, show the individual goals
SELECT 
    oyg.goal_text,
    oyg.sort_order
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY oyg.sort_order;