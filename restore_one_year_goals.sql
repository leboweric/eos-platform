-- Restore 1-Year Goals for Boyum organization
-- First, get the one year plan ID

DO $$
DECLARE
    v_plan_id UUID;
BEGIN
    -- Get the one year plan ID for Boyum
    SELECT oyp.id INTO v_plan_id
    FROM one_year_plans oyp
    JOIN business_blueprints bp ON bp.id = oyp.vto_id
    JOIN organizations o ON o.id = bp.organization_id
    WHERE o.slug = 'boyum'
    LIMIT 1;
    
    IF v_plan_id IS NOT NULL THEN
        -- Delete any existing goals first (cleanup)
        DELETE FROM one_year_goals WHERE one_year_plan_id = v_plan_id;
        
        -- Insert sample goals
        INSERT INTO one_year_goals (id, one_year_plan_id, goal_text, sort_order, is_completed) VALUES
        (gen_random_uuid(), v_plan_id, 'Achieve $26.7M in revenue', 0, false),
        (gen_random_uuid(), v_plan_id, 'Launch new product line', 1, false),
        (gen_random_uuid(), v_plan_id, 'Expand to 3 new markets', 2, false),
        (gen_random_uuid(), v_plan_id, 'Increase customer satisfaction to 95%', 3, false),
        (gen_random_uuid(), v_plan_id, 'Hire 10 key positions', 4, false);
        
        RAISE NOTICE 'Successfully restored 5 goals for Boyum organization';
    ELSE
        RAISE NOTICE 'No one year plan found for Boyum organization';
    END IF;
END $$;

-- Verify the goals were created
SELECT 
    oyg.*,
    o.name as org_name
FROM one_year_goals oyg
JOIN one_year_plans oyp ON oyp.id = oyg.one_year_plan_id
JOIN business_blueprints bp ON bp.id = oyp.vto_id
JOIN organizations o ON o.id = bp.organization_id
WHERE o.slug = 'boyum'
ORDER BY oyg.sort_order;