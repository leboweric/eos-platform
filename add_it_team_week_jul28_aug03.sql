-- =====================================================
-- Add IT Team Scorecard Data for Week of Jul 28 - Aug 03, 2024
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id UUID;
    v_week_date DATE := '2025-07-28';  -- Sunday of the week (current year)
    v_count INTEGER;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    -- Get IT Team ID
    SELECT id INTO it_team_id 
    FROM teams 
    WHERE organization_id = org_id 
      AND name = 'IT Team';
    
    IF it_team_id IS NULL THEN
        RAISE EXCEPTION 'IT Team not found for Boyum organization';
    END IF;
    
    RAISE NOTICE 'Adding scorecard data for IT Team (%) for week of %', it_team_id, v_week_date;

    -- =====================================================
    -- 1. Automation - Completed: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Automation - Completed';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 2. Automation - In Progress: 1
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Automation - In Progress';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());

    -- =====================================================
    -- 3. Automation - Suggestions: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Automation - Suggestions';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 4. CSAT - Neutral/Negative: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'CSAT - Neutral/Negative';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 5. CSAT - Positive: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'CSAT - Positive';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 6. Tickets per week: 29
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Tickets per week';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 29, NOW(), NOW());

    -- =====================================================
    -- 7. Tickets: < 5-days old: 6
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Tickets: < 5-days old';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 6, NOW(), NOW());

    -- =====================================================
    -- 8. Tickets: >30-days old: 1
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Tickets: >30-days old';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());

    -- =====================================================
    -- 9. After Hours Tickets: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'After Hours Tickets';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 10. Saturday Morning Tickets: 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Saturday Morning Tickets';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 11. Individual - Helpdesk Hours (Target: 10): 8
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Individual - Helpdesk Hours (Target: 10)';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 8, NOW(), NOW());

    -- =====================================================
    -- 12. Individual - Helpdesk Hours (Target: 8): 0
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Individual - Helpdesk Hours (Target: 8)';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());

    -- =====================================================
    -- 13. Individual - Daily touchpoints on tickets: 47%
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'Individual - Daily touchpoints on tickets';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 47, NOW(), NOW());

    -- =====================================================
    -- 14. FreshService IT Documents Created/Updated/Reviewed: 1
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());

    -- =====================================================
    -- 15. FreshService Staff Articles Created/Updated/Reviewed: 1
    -- =====================================================
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id 
    AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());

    -- Count how many scores were added
    SELECT COUNT(*) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.team_id = it_team_id
      AND ss.week_date = v_week_date;

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Successfully added % scores for IT Team', v_count;
    RAISE NOTICE 'Week: %', v_week_date;
    RAISE NOTICE '=====================================================';

END $$;

COMMIT;

-- =====================================================
-- Verification Query - Check the scores were added
-- =====================================================
SELECT 
    sm.name as metric_name,
    sm.goal,
    ss.value as actual_value,
    CASE 
        WHEN sm.comparison_operator = 'greater_equal' AND ss.value >= sm.goal THEN '✓ Met'
        WHEN sm.comparison_operator = 'less_equal' AND ss.value <= sm.goal THEN '✓ Met'
        WHEN sm.comparison_operator = 'equal' AND ss.value = sm.goal THEN '✓ Met'
        ELSE '✗ Not Met'
    END as goal_status
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
  AND ss.week_date = '2025-07-28'
ORDER BY sm.name;