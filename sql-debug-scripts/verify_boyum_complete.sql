-- =====================================================
-- Verify Boyum Barenscheer's Complete Business Blueprint
-- =====================================================

-- 1. Organization & Blueprint
SELECT 
    'ORGANIZATION' as component,
    o.name,
    o.slug,
    bb.id as blueprint_id,
    bb.team_id,
    CASE WHEN bb.team_id IS NULL THEN '✅ Org-level (correct)' ELSE '❌ Team-level (wrong)' END as status
FROM organizations o
JOIN business_blueprints bb ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
AND bb.team_id IS NULL;

-- 2. Core Values
SELECT 
    'CORE VALUES' as component,
    COUNT(*) as count,
    STRING_AGG(value_text, ', ' ORDER BY sort_order) as values
FROM core_values cv
JOIN business_blueprints bb ON cv.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 3. Core Focus
SELECT 
    'CORE FOCUS' as component,
    cf.purpose_cause_passion,
    cf.niche
FROM core_focus cf
JOIN business_blueprints bb ON cf.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 4. 3-Year Picture
SELECT 
    'THREE YEAR PICTURE' as component,
    typ.future_date,
    typ.revenue_target / 1000000.0 || 'M' as revenue,
    CASE 
        WHEN typ.what_does_it_look_like IS NOT NULL THEN 
            '✅ ' || json_array_length(typ.what_does_it_look_like::json) || ' vision items'
        ELSE '❌ No vision items'
    END as vision_items
FROM three_year_pictures typ
JOIN business_blueprints bb ON typ.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 5. 1-Year Plan
SELECT 
    'ONE YEAR PLAN' as component,
    oyp.future_date,
    oyp.revenue_target / 1000000.0 || 'M' as revenue,
    COUNT(oyg.id) || ' goals' as goals
FROM one_year_plans oyp
LEFT JOIN one_year_goals oyg ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
GROUP BY oyp.id, oyp.future_date, oyp.revenue_target;

-- 6. 1-Year Goals List
SELECT 
    'GOAL #' || oyg.sort_order as item,
    oyg.goal_text
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY oyg.sort_order;

-- 7. Summary
SELECT 
    '✅ BOYUM BARENSCHEER BLUEPRINT COMPLETE' as status,
    'Core Values: ' || (SELECT COUNT(*) FROM core_values cv JOIN business_blueprints bb ON cv.vto_id = bb.id JOIN organizations o ON bb.organization_id = o.id WHERE o.slug = 'boyum-barenscheer') || ', ' ||
    'Core Focus: ' || (SELECT COUNT(*) FROM core_focus cf JOIN business_blueprints bb ON cf.vto_id = bb.id JOIN organizations o ON bb.organization_id = o.id WHERE o.slug = 'boyum-barenscheer') || ', ' ||
    '3-Year Picture: ' || (SELECT COUNT(*) FROM three_year_pictures typ JOIN business_blueprints bb ON typ.vto_id = bb.id JOIN organizations o ON bb.organization_id = o.id WHERE o.slug = 'boyum-barenscheer') || ', ' ||
    '1-Year Plan: ' || (SELECT COUNT(*) FROM one_year_plans oyp JOIN business_blueprints bb ON oyp.vto_id = bb.id JOIN organizations o ON bb.organization_id = o.id WHERE o.slug = 'boyum-barenscheer') || ', ' ||
    '1-Year Goals: ' || (SELECT COUNT(*) FROM one_year_goals oyg JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id JOIN business_blueprints bb ON oyp.vto_id = bb.id JOIN organizations o ON bb.organization_id = o.id WHERE o.slug = 'boyum-barenscheer')
    as components;