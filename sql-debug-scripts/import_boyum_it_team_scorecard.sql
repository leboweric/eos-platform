-- =====================================================
-- Import IT Team Scorecard for Boyum Barenscheer
-- With full safety checks to ensure correct team targeting
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id UUID;
    v_count INTEGER;
BEGIN
    -- =====================================================
    -- SAFETY CHECK 1: Get Boyum's organization ID
    -- =====================================================
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Found Boyum Organization ID: %', org_id;

    -- =====================================================
    -- SAFETY CHECK 2: Get IT Team ID for Boyum specifically
    -- =====================================================
    SELECT id INTO it_team_id 
    FROM teams 
    WHERE organization_id = org_id 
      AND name = 'IT Team';
    
    IF it_team_id IS NULL THEN
        RAISE EXCEPTION 'IT Team not found for Boyum organization';
    END IF;
    
    RAISE NOTICE 'Found IT Team ID: % for Boyum', it_team_id;

    -- =====================================================
    -- SAFETY CHECK 3: Verify we're updating the right team
    -- =====================================================
    SELECT COUNT(*) INTO v_count
    FROM teams 
    WHERE id = it_team_id 
      AND organization_id = org_id 
      AND name = 'IT Team';
    
    IF v_count != 1 THEN
        RAISE EXCEPTION 'Team verification failed. Expected 1 team, found %', v_count;
    END IF;
    
    RAISE NOTICE 'Verified: IT Team belongs to Boyum organization';
    RAISE NOTICE 'Starting IT Team scorecard metrics import...';

    -- =====================================================
    -- 1. Automation - Completed
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Automation - Completed';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Automation - Completed', 0, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Automation - Completed';
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, 
            type = 'weekly', 
            value_type = 'number',
            comparison_operator = 'greater_equal',
            updated_at = NOW()
        WHERE id = v_metric_id;
        RAISE NOTICE 'Updated metric: Automation - Completed';
    END IF;

    -- =====================================================
    -- 2. Automation - In Progress
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Automation - In Progress';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Automation - In Progress', 0, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Automation - In Progress';
    END IF;

    -- =====================================================
    -- 3. Automation - Suggestions
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Automation - Suggestions';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Automation - Suggestions', 0, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Automation - Suggestions';
    END IF;

    -- =====================================================
    -- 4. CSAT - Neutral/Negative
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'CSAT - Neutral/Negative';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'CSAT - Neutral/Negative', 0, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: CSAT - Neutral/Negative';
    END IF;

    -- =====================================================
    -- 5. CSAT - Positive
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'CSAT - Positive';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'CSAT - Positive', 2, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: CSAT - Positive';
    END IF;

    -- =====================================================
    -- 6. Tickets per week
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Tickets per week';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Tickets per week', 0, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Tickets per week';
    END IF;

    -- =====================================================
    -- 7. Tickets: < 5-days old
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Tickets: < 5-days old';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Tickets: < 5-days old', 1, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Tickets: < 5-days old';
    END IF;

    -- =====================================================
    -- 8. Tickets: >30-days old
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Tickets: >30-days old';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Tickets: >30-days old', 0, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Tickets: >30-days old';
    END IF;

    -- =====================================================
    -- 9. After Hours Tickets
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'After Hours Tickets';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'After Hours Tickets', 0, 
            'weekly', 'number', 'equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: After Hours Tickets';
    END IF;

    -- =====================================================
    -- 10. Saturday Morning Tickets
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Saturday Morning Tickets';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Saturday Morning Tickets', 0, 
            'weekly', 'number', 'equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Saturday Morning Tickets';
    END IF;

    -- =====================================================
    -- 11. Individual - Helpdesk Hours (First metric - <=10)
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Individual - Helpdesk Hours (Target: 10)';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Individual - Helpdesk Hours (Target: 10)', 10, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Individual - Helpdesk Hours (Target: 10)';
    END IF;

    -- =====================================================
    -- 12. Individual - Helpdesk Hours (Second metric - <=8)
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Individual - Helpdesk Hours (Target: 8)';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Individual - Helpdesk Hours (Target: 8)', 8, 
            'weekly', 'number', 'less_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Individual - Helpdesk Hours (Target: 8)';
    END IF;

    -- =====================================================
    -- 13. Individual - Daily touchpoints on tickets
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Individual - Daily touchpoints on tickets';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'Individual - Daily touchpoints on tickets', 50, 
            'weekly', 'percentage', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: Individual - Daily touchpoints on tickets';
    END IF;

    -- =====================================================
    -- 14. FreshService IT Documents Created/Updated/Reviewed
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'FreshService IT Documents Created/Updated/Reviewed', 0, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: FreshService IT Documents Created/Updated/Reviewed';
    END IF;

    -- =====================================================
    -- 15. FreshService Staff Articles Created/Updated/Reviewed
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (
            organization_id, team_id, name, goal, 
            type, value_type, comparison_operator, 
            created_at, updated_at
        )
        VALUES (
            org_id, it_team_id, 'FreshService Staff Articles Created/Updated/Reviewed', 0, 
            'weekly', 'number', 'greater_equal', 
            NOW(), NOW()
        )
        RETURNING id INTO v_metric_id;
        RAISE NOTICE 'Created metric: FreshService Staff Articles Created/Updated/Reviewed';
    END IF;

    -- =====================================================
    -- FINAL VERIFICATION
    -- =====================================================
    SELECT COUNT(*) INTO v_count
    FROM scorecard_metrics
    WHERE organization_id = org_id 
      AND team_id = it_team_id;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'IT Team Scorecard Import Complete!';
    RAISE NOTICE 'Total metrics for IT Team: %', v_count;
    RAISE NOTICE 'Organization: Boyum Barenscheer (ID: %)', org_id;
    RAISE NOTICE 'Team: IT Team (ID: %)', it_team_id;
    RAISE NOTICE '=====================================================';

END $$;

-- =====================================================
-- Verification Queries (Run these after COMMIT to verify)
-- =====================================================
-- Check all IT Team metrics:
/*
SELECT 
    sm.name as metric_name,
    sm.goal,
    sm.comparison_operator,
    sm.value_type,
    sm.type as frequency,
    t.name as team_name,
    o.name as org_name
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
ORDER BY sm.name;
*/

-- Count metrics by team for Boyum:
/*
SELECT 
    t.name as team_name,
    COUNT(sm.id) as metric_count
FROM teams t
LEFT JOIN scorecard_metrics sm ON t.id = sm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
GROUP BY t.name
ORDER BY metric_count DESC;
*/

COMMIT;