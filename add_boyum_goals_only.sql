-- =====================================================
-- Add Goals to Boyum's Existing 1-Year Plan
-- =====================================================

-- Clear any failed transactions
ROLLBACK;

BEGIN;

DO $$
DECLARE
    plan_id UUID;  -- Changed variable name to avoid conflict
BEGIN
    -- Get Boyum's 1-Year Plan ID
    SELECT oyp.id INTO plan_id
    FROM one_year_plans oyp
    JOIN business_blueprints bb ON oyp.vto_id = bb.id
    JOIN organizations o ON bb.organization_id = o.id
    WHERE o.slug = 'boyum-barenscheer';
    
    IF plan_id IS NULL THEN
        RAISE EXCEPTION 'No 1-Year Plan found for Boyum Barenscheer';
    END IF;
    
    RAISE NOTICE 'Found 1-Year Plan ID: %', plan_id;
    
    -- Check if goals already exist
    IF EXISTS (SELECT 1 FROM one_year_goals oyg WHERE oyg.one_year_plan_id = plan_id) THEN
        -- Delete existing goals to replace them
        DELETE FROM one_year_goals WHERE one_year_plan_id = plan_id;
        RAISE NOTICE 'Deleted existing goals';
    END IF;
    
    -- Insert the 8 goals
    INSERT INTO one_year_goals (one_year_plan_id, goal_text, sort_order, created_at, updated_at)
    VALUES 
        (plan_id, 'Average of 50 Hours per Week for Staff During Busy Season', 1, NOW(), NOW()),
        (plan_id, 'Change 25% of Clients under 70% of realization', 2, NOW(), NOW()),
        (plan_id, 'Staff up budgeting process for billable hours with revenue goal', 3, NOW(), NOW()),
        (plan_id, 'Implement EOS in Leadership Team, BAS, Tax, A&A, HR, IT, Marketing (top levels)', 4, NOW(), NOW()),
        (plan_id, 'Succession Plan Drafts in place for JT, TH, RF', 5, NOW(), NOW()),
        (plan_id, 'Career Coaching Plan in Place for Partners to career coach Managers', 6, NOW(), NOW()),
        (plan_id, 'Karbon fully implemented', 7, NOW(), NOW()),
        (plan_id, 'Create Phase 2 of career coaching plan for staff', 8, NOW(), NOW());
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Goals Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added 8 goals to Boyum''s 1-Year Plan';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the goals were added
SELECT 
    'VERIFICATION' as check,
    oyg.goal_text,
    oyg.sort_order,
    oyg.is_completed
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY oyg.sort_order;

-- Count check
SELECT 
    'TOTAL GOALS' as check,
    COUNT(*) as goal_count
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';