-- =====================================================
-- Inspect Boyum's 1-Year Plan Data
-- =====================================================

-- 1. Check what's in the one_year_plans table
SELECT 
    'ONE_YEAR_PLANS TABLE' as check_type,
    oyp.id,
    oyp.vto_id,
    oyp.future_date,
    oyp.revenue_target,
    oyp.profit_target,
    oyp.created_at,
    o.name as org_name
FROM one_year_plans oyp
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 2. Check what's in the one_year_goals table
SELECT 
    'ONE_YEAR_GOALS TABLE' as check_type,
    oyg.id,
    oyg.one_year_plan_id,
    oyg.goal_text,
    oyg.sort_order,
    oyg.created_at
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
ORDER BY oyg.sort_order;

-- 3. Check if there's a different column storing goals as JSON
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'one_year_goals'
ORDER BY ordinal_position;

-- 4. Count how many goals Boyum has
SELECT 
    'GOAL COUNT' as check_type,
    COUNT(*) as total_goals
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyg.one_year_plan_id = oyp.id
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 5. Check if there are any other columns in one_year_plans that might store goals
SELECT 
    'COLUMNS WITH DATA TYPE TEXT OR JSON' as check_type,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'one_year_plans'
AND data_type IN ('text', 'json', 'jsonb', 'character varying')
ORDER BY ordinal_position;

-- 6. Raw dump of Boyum's one_year_plans record
SELECT * 
FROM one_year_plans oyp
JOIN business_blueprints bb ON oyp.vto_id = bb.id
JOIN organizations o ON bb.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer';

-- 7. Check for duplicate one_year_plans
SELECT 
    'DUPLICATE CHECK' as check_type,
    vto_id,
    COUNT(*) as plan_count
FROM one_year_plans
WHERE vto_id IN (
    SELECT id FROM business_blueprints 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
)
GROUP BY vto_id
HAVING COUNT(*) > 1;