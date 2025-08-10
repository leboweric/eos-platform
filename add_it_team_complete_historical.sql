-- =====================================================
-- Add IT Team Complete Historical Scorecard Data
-- =====================================================
-- This version adds all data from May 12 to July 28, 2025
-- Safely handles missing metrics

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id UUID;
    v_count INTEGER;
    v_week_date DATE;
    v_metric_name TEXT;
    v_value NUMERIC;
    v_missing_metrics TEXT := '';
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
    
    RAISE NOTICE 'Adding complete historical scorecard data for IT Team (%)...', it_team_id;

    -- First, let's check which metrics don't exist
    -- Try to find Individual metrics
    SELECT COUNT(*) INTO v_count
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name LIKE 'Individual%';
    
    IF v_count = 0 THEN
        RAISE NOTICE 'WARNING: No Individual metrics found. Adding them now...';
        
        -- Add the missing Individual metrics
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, owner, type, value_type, comparison_operator, created_at, updated_at)
        VALUES 
        (org_id, it_team_id, 'Individual - Helpdesk Hours (Target: 10)', 10, 'IT Team', 'weekly', 'number', 'less_equal', NOW(), NOW()),
        (org_id, it_team_id, 'Individual - Helpdesk Hours (Target: 8)', 8, 'IT Team', 'weekly', 'number', 'less_equal', NOW(), NOW()),
        (org_id, it_team_id, 'Individual - Daily touchpoints on tickets', 80, 'IT Team', 'weekly', 'percentage', 'greater_equal', NOW(), NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Added missing Individual metrics';
    END IF;

    -- Create temporary table with all the data
    CREATE TEMP TABLE temp_it_scorecard_data (
        week_date DATE,
        metric_name TEXT,
        value NUMERIC
    );

    -- Insert all the historical data
    INSERT INTO temp_it_scorecard_data (week_date, metric_name, value) VALUES
    -- Week: Jul 28, 2025
    ('2025-07-28', 'Automation - Completed', 0),
    ('2025-07-28', 'Automation - In Progress', 1),
    ('2025-07-28', 'Automation - Suggestions', 0),
    ('2025-07-28', 'CSAT - Neutral/Negative', 0),
    ('2025-07-28', 'CSAT - Positive', 0),
    ('2025-07-28', 'Tickets per week', 29),
    ('2025-07-28', 'Tickets: < 5-days old', 6),
    ('2025-07-28', 'Tickets: >30-days old', 1),
    ('2025-07-28', 'After Hours Tickets', 0),
    ('2025-07-28', 'Saturday Morning Tickets', 0),
    ('2025-07-28', 'Individual - Helpdesk Hours (Target: 10)', 8),
    ('2025-07-28', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-07-28', 'Individual - Daily touchpoints on tickets', 47),
    ('2025-07-28', 'FreshService IT Documents Created/Updated/Reviewed', 1),
    ('2025-07-28', 'FreshService Staff Articles Created/Updated/Reviewed', 1),
    
    -- Week: Jul 21, 2025
    ('2025-07-21', 'Automation - Completed', 0),
    ('2025-07-21', 'Automation - In Progress', 1),
    ('2025-07-21', 'Automation - Suggestions', 0),
    ('2025-07-21', 'CSAT - Neutral/Negative', 0),
    ('2025-07-21', 'CSAT - Positive', 0),
    ('2025-07-21', 'Tickets per week', 31),
    ('2025-07-21', 'Tickets: < 5-days old', 4),
    ('2025-07-21', 'Tickets: >30-days old', 2),
    ('2025-07-21', 'After Hours Tickets', 0),
    ('2025-07-21', 'Saturday Morning Tickets', 0),
    ('2025-07-21', 'Individual - Helpdesk Hours (Target: 10)', 3.25),
    ('2025-07-21', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-07-21', 'Individual - Daily touchpoints on tickets', 36),
    ('2025-07-21', 'FreshService IT Documents Created/Updated/Reviewed', 1),
    ('2025-07-21', 'FreshService Staff Articles Created/Updated/Reviewed', 0),
    
    -- Week: Jul 14, 2025
    ('2025-07-14', 'Automation - Completed', 0),
    ('2025-07-14', 'Automation - In Progress', 1),
    ('2025-07-14', 'Automation - Suggestions', 0),
    ('2025-07-14', 'CSAT - Neutral/Negative', 0),
    ('2025-07-14', 'CSAT - Positive', 0),
    ('2025-07-14', 'Tickets per week', 24),
    ('2025-07-14', 'Tickets: < 5-days old', 4),
    ('2025-07-14', 'Tickets: >30-days old', 2),
    ('2025-07-14', 'After Hours Tickets', 0),
    ('2025-07-14', 'Saturday Morning Tickets', 0),
    ('2025-07-14', 'Individual - Helpdesk Hours (Target: 10)', 2.75),
    ('2025-07-14', 'Individual - Helpdesk Hours (Target: 8)', 5),
    ('2025-07-14', 'Individual - Daily touchpoints on tickets', 60),
    ('2025-07-14', 'FreshService IT Documents Created/Updated/Reviewed', 2),
    ('2025-07-14', 'FreshService Staff Articles Created/Updated/Reviewed', 1),
    
    -- Week: Jul 07, 2025
    ('2025-07-07', 'Automation - Completed', 1),
    ('2025-07-07', 'Automation - In Progress', 1),
    ('2025-07-07', 'Automation - Suggestions', 0),
    ('2025-07-07', 'CSAT - Neutral/Negative', 0),
    ('2025-07-07', 'CSAT - Positive', 0),
    ('2025-07-07', 'Tickets per week', 27),
    ('2025-07-07', 'Tickets: < 5-days old', 3),
    ('2025-07-07', 'Tickets: >30-days old', 1),
    ('2025-07-07', 'After Hours Tickets', 1),
    ('2025-07-07', 'Saturday Morning Tickets', 0),
    ('2025-07-07', 'Individual - Helpdesk Hours (Target: 10)', 9),
    ('2025-07-07', 'Individual - Helpdesk Hours (Target: 8)', 5),
    ('2025-07-07', 'Individual - Daily touchpoints on tickets', 82),
    ('2025-07-07', 'FreshService IT Documents Created/Updated/Reviewed', 10),
    ('2025-07-07', 'FreshService Staff Articles Created/Updated/Reviewed', 4),
    
    -- Week: Jun 30, 2025
    ('2025-06-30', 'Automation - Completed', 0),
    ('2025-06-30', 'Automation - In Progress', 0),
    ('2025-06-30', 'Automation - Suggestions', 1),
    ('2025-06-30', 'CSAT - Neutral/Negative', 0),
    ('2025-06-30', 'CSAT - Positive', 0),
    ('2025-06-30', 'Tickets per week', 15),
    ('2025-06-30', 'Tickets: < 5-days old', 7),
    ('2025-06-30', 'Tickets: >30-days old', 4),
    ('2025-06-30', 'After Hours Tickets', 2),
    ('2025-06-30', 'Saturday Morning Tickets', 0),
    ('2025-06-30', 'Individual - Helpdesk Hours (Target: 10)', 5),
    ('2025-06-30', 'Individual - Helpdesk Hours (Target: 8)', 1),
    ('2025-06-30', 'Individual - Daily touchpoints on tickets', 75),
    ('2025-06-30', 'FreshService IT Documents Created/Updated/Reviewed', 0),
    ('2025-06-30', 'FreshService Staff Articles Created/Updated/Reviewed', 0),
    
    -- Week: Jun 23, 2025
    ('2025-06-23', 'Automation - Completed', 0),
    ('2025-06-23', 'Automation - In Progress', 1),
    ('2025-06-23', 'Automation - Suggestions', 0),
    ('2025-06-23', 'CSAT - Neutral/Negative', 0),
    ('2025-06-23', 'CSAT - Positive', 0),
    ('2025-06-23', 'Tickets per week', 30),
    ('2025-06-23', 'Tickets: < 5-days old', 5),
    ('2025-06-23', 'Tickets: >30-days old', 1),
    ('2025-06-23', 'After Hours Tickets', 3),
    ('2025-06-23', 'Saturday Morning Tickets', 0),
    ('2025-06-23', 'Individual - Helpdesk Hours (Target: 10)', 0),
    ('2025-06-23', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-06-23', 'Individual - Daily touchpoints on tickets', 90),
    ('2025-06-23', 'FreshService IT Documents Created/Updated/Reviewed', 3),
    ('2025-06-23', 'FreshService Staff Articles Created/Updated/Reviewed', 4),
    
    -- Week: Jun 16, 2025
    ('2025-06-16', 'Automation - Completed', 0),
    ('2025-06-16', 'Automation - In Progress', 0),
    ('2025-06-16', 'Automation - Suggestions', 0),
    ('2025-06-16', 'CSAT - Neutral/Negative', 0),
    ('2025-06-16', 'CSAT - Positive', 0),
    ('2025-06-16', 'Tickets per week', 9),
    ('2025-06-16', 'Tickets: < 5-days old', 5),
    ('2025-06-16', 'Tickets: >30-days old', 1),
    ('2025-06-16', 'After Hours Tickets', 1),
    ('2025-06-16', 'Saturday Morning Tickets', 0),
    ('2025-06-16', 'Individual - Helpdesk Hours (Target: 10)', 8.25),
    ('2025-06-16', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-06-16', 'Individual - Daily touchpoints on tickets', 13),
    ('2025-06-16', 'FreshService IT Documents Created/Updated/Reviewed', 0),
    ('2025-06-16', 'FreshService Staff Articles Created/Updated/Reviewed', 0),
    
    -- Week: Jun 09, 2025
    ('2025-06-09', 'Automation - Completed', 0),
    ('2025-06-09', 'Automation - In Progress', 0),
    ('2025-06-09', 'Automation - Suggestions', 0),
    ('2025-06-09', 'CSAT - Neutral/Negative', 0),
    ('2025-06-09', 'CSAT - Positive', 0),
    ('2025-06-09', 'Tickets per week', 36),
    ('2025-06-09', 'Tickets: < 5-days old', 5),
    ('2025-06-09', 'Tickets: >30-days old', 1),
    ('2025-06-09', 'After Hours Tickets', 1),
    ('2025-06-09', 'Saturday Morning Tickets', 0),
    ('2025-06-09', 'Individual - Helpdesk Hours (Target: 10)', 12.5),
    ('2025-06-09', 'Individual - Helpdesk Hours (Target: 8)', 2.5),
    ('2025-06-09', 'Individual - Daily touchpoints on tickets', 17),
    ('2025-06-09', 'FreshService IT Documents Created/Updated/Reviewed', 1),
    ('2025-06-09', 'FreshService Staff Articles Created/Updated/Reviewed', 0),
    
    -- Week: Jun 02, 2025
    ('2025-06-02', 'Automation - Completed', 0),
    ('2025-06-02', 'Automation - In Progress', 0),
    ('2025-06-02', 'Automation - Suggestions', 0),
    ('2025-06-02', 'CSAT - Neutral/Negative', 0),
    ('2025-06-02', 'CSAT - Positive', 0),
    ('2025-06-02', 'Tickets per week', 40),
    ('2025-06-02', 'Tickets: < 5-days old', 4),
    ('2025-06-02', 'Tickets: >30-days old', 0),
    ('2025-06-02', 'After Hours Tickets', 0),
    ('2025-06-02', 'Saturday Morning Tickets', 0),
    ('2025-06-02', 'Individual - Helpdesk Hours (Target: 10)', 14.5),
    ('2025-06-02', 'Individual - Helpdesk Hours (Target: 8)', 2),
    ('2025-06-02', 'Individual - Daily touchpoints on tickets', 71),
    ('2025-06-02', 'FreshService IT Documents Created/Updated/Reviewed', 9),
    ('2025-06-02', 'FreshService Staff Articles Created/Updated/Reviewed', 0),
    
    -- Week: May 26, 2025
    ('2025-05-26', 'Automation - Completed', 0),
    ('2025-05-26', 'Automation - In Progress', 1),
    ('2025-05-26', 'Automation - Suggestions', 0),
    ('2025-05-26', 'CSAT - Neutral/Negative', 0),
    ('2025-05-26', 'CSAT - Positive', 0),
    ('2025-05-26', 'Tickets per week', 20),
    ('2025-05-26', 'Tickets: < 5-days old', 4),
    ('2025-05-26', 'Tickets: >30-days old', 0),
    ('2025-05-26', 'After Hours Tickets', 2),
    ('2025-05-26', 'Saturday Morning Tickets', 0),
    ('2025-05-26', 'Individual - Helpdesk Hours (Target: 10)', 17.5),
    ('2025-05-26', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-05-26', 'Individual - Daily touchpoints on tickets', 59),
    ('2025-05-26', 'FreshService IT Documents Created/Updated/Reviewed', 6),
    ('2025-05-26', 'FreshService Staff Articles Created/Updated/Reviewed', 1),
    
    -- Week: May 19, 2025
    ('2025-05-19', 'Automation - Completed', 0),
    ('2025-05-19', 'Automation - In Progress', 0),
    ('2025-05-19', 'Automation - Suggestions', 0),
    ('2025-05-19', 'CSAT - Neutral/Negative', 0),
    ('2025-05-19', 'CSAT - Positive', 0),
    ('2025-05-19', 'Tickets per week', 32),
    ('2025-05-19', 'Tickets: < 5-days old', 6),
    ('2025-05-19', 'Tickets: >30-days old', 1),
    ('2025-05-19', 'After Hours Tickets', 1),
    ('2025-05-19', 'Saturday Morning Tickets', 0),
    ('2025-05-19', 'Individual - Helpdesk Hours (Target: 10)', 12.5),
    ('2025-05-19', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-05-19', 'Individual - Daily touchpoints on tickets', 42),
    ('2025-05-19', 'FreshService IT Documents Created/Updated/Reviewed', 0),
    ('2025-05-19', 'FreshService Staff Articles Created/Updated/Reviewed', 3),
    
    -- Week: May 12, 2025
    ('2025-05-12', 'Automation - Completed', 0),
    ('2025-05-12', 'Automation - In Progress', 0),
    ('2025-05-12', 'Automation - Suggestions', 0),
    ('2025-05-12', 'CSAT - Neutral/Negative', 0),
    ('2025-05-12', 'CSAT - Positive', 0),
    ('2025-05-12', 'Tickets per week', 22),
    ('2025-05-12', 'Tickets: < 5-days old', 2),
    ('2025-05-12', 'Tickets: >30-days old', 1),
    ('2025-05-12', 'After Hours Tickets', 0),
    ('2025-05-12', 'Saturday Morning Tickets', 0),
    ('2025-05-12', 'Individual - Helpdesk Hours (Target: 10)', 4.5),
    ('2025-05-12', 'Individual - Helpdesk Hours (Target: 8)', 0),
    ('2025-05-12', 'Individual - Daily touchpoints on tickets', 58),
    ('2025-05-12', 'FreshService IT Documents Created/Updated/Reviewed', 0),
    ('2025-05-12', 'FreshService Staff Articles Created/Updated/Reviewed', 2);

    -- Now process each row from the temp table
    FOR v_week_date, v_metric_name, v_value IN 
        SELECT week_date, metric_name, value FROM temp_it_scorecard_data
    LOOP
        -- Get the metric ID
        SELECT id INTO v_metric_id 
        FROM scorecard_metrics 
        WHERE organization_id = org_id 
          AND team_id = it_team_id 
          AND name = v_metric_name;
        
        IF v_metric_id IS NOT NULL THEN
            -- Delete existing score for this date if any
            DELETE FROM scorecard_scores 
            WHERE metric_id = v_metric_id AND week_date = v_week_date;
            
            -- Insert the new score
            INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
            VALUES (v_metric_id, v_week_date, v_value, NOW(), NOW());
        ELSE
            -- Track missing metrics
            IF position(v_metric_name IN v_missing_metrics) = 0 THEN
                v_missing_metrics := v_missing_metrics || v_metric_name || ', ';
            END IF;
        END IF;
    END LOOP;

    -- Clean up temp table
    DROP TABLE temp_it_scorecard_data;

    -- Report results
    SELECT COUNT(DISTINCT ss.week_date) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.team_id = it_team_id;
    
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Successfully added historical data for % weeks', v_count;
    IF LENGTH(v_missing_metrics) > 0 THEN
        RAISE NOTICE 'Missing metrics (data not added): %', v_missing_metrics;
    END IF;
    RAISE NOTICE '=====================================================';

END $$;

COMMIT;

-- =====================================================
-- Verification Query - Show all weeks and their completion
-- =====================================================
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores,
    STRING_AGG(sm.name || ': ' || ss.value, ', ' ORDER BY sm.name) as scores
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;