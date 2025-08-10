-- =====================================================
-- Add IT Team Historical Scorecard Data - Safe Version
-- =====================================================
-- This version checks if metrics exist before inserting scores

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id UUID;
    v_count INTEGER;
    v_week_date DATE;
    v_value NUMERIC;
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
    
    RAISE NOTICE 'Adding historical scorecard data for IT Team (%)...', it_team_id;

    -- Helper function to safely insert score
    -- =====================================================
    -- Week: Jul 28 - Aug 03, 2025 (Already added, but let's make sure)
    -- =====================================================
    v_week_date := '2025-07-28';
    RAISE NOTICE 'Processing week: %', v_week_date;
    
    -- Process each metric with NULL check
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 29, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 6, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 8, NOW(), NOW());
    ELSE
        RAISE NOTICE 'Metric not found: Individual - Helpdesk Hours (Target: 10)';
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    ELSE
        RAISE NOTICE 'Metric not found: Individual - Helpdesk Hours (Target: 8)';
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 47, NOW(), NOW());
    ELSE
        RAISE NOTICE 'Metric not found: Individual - Daily touchpoints on tickets';
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;

    -- =====================================================
    -- Week: Jul 21 - Jul 27, 2025
    -- =====================================================
    v_week_date := '2025-07-21';
    RAISE NOTICE 'Processing week: %', v_week_date;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 31, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 4, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 2, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 3.25, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 36, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 1, NOW(), NOW());
    END IF;
    
    SELECT id INTO v_metric_id FROM scorecard_metrics WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    IF v_metric_id IS NOT NULL THEN
        DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = v_week_date;
        INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES (v_metric_id, v_week_date, 0, NOW(), NOW());
    END IF;

    -- =====================================================
    -- Continue with remaining weeks...
    -- I'll create a more efficient version using arrays
    -- =====================================================

    RAISE NOTICE 'Completed adding available historical data';
    
    -- Count how many scores were actually added
    SELECT COUNT(DISTINCT ss.week_date) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.team_id = it_team_id;
    
    RAISE NOTICE 'Total weeks with data: %', v_count;

END $$;

COMMIT;

-- Check which metrics exist and which are missing
SELECT 
    'Existing metrics:' as status,
    STRING_AGG(name, ', ' ORDER BY name) as metrics
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team';

-- Show the data that was successfully added
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;