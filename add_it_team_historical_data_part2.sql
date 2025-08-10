-- =====================================================
-- Add IT Team Historical Scorecard Data - Part 2
-- =====================================================
-- Adding historical data from Jun 09 - May 18, 2025

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id UUID;
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
    
    RAISE NOTICE 'Adding historical scorecard data Part 2 for IT Team (%)...', it_team_id;

    -- =====================================================
    -- Week: Jun 09 - Jun 15, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jun 09 - Jun 15, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- Tickets per week: 36
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 36, NOW(), NOW());
    
    -- Tickets: < 5-days old: 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 5, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 1, NOW(), NOW());
    
    -- After Hours Tickets: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 1, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 12.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 12.5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 2.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 2.5, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 17%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 17, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 1, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-09';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-09', 0, NOW(), NOW());

    -- =====================================================
    -- Week: Jun 02 - Jun 08, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jun 02 - Jun 08, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- Tickets per week: 40
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 40, NOW(), NOW());
    
    -- Tickets: < 5-days old: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 4, NOW(), NOW());
    
    -- Tickets: >30-days old: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- After Hours Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 14.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 14.5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 2, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 71%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 71, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 9
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 9, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-02';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-02', 0, NOW(), NOW());

    -- =====================================================
    -- Week: May 26 - Jun 01, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week May 26 - Jun 01, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- Automation - In Progress: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 1, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- Tickets per week: 20
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 20, NOW(), NOW());
    
    -- Tickets: < 5-days old: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 4, NOW(), NOW());
    
    -- Tickets: >30-days old: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- After Hours Tickets: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 2, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 17.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 17.5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 59%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 59, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 6
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 6, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-26';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-26', 1, NOW(), NOW());

    -- =====================================================
    -- Week: May 19 - May 25, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week May 19 - May 25, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- Tickets per week: 32
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 32, NOW(), NOW());
    
    -- Tickets: < 5-days old: 6
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 6, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 1, NOW(), NOW());
    
    -- After Hours Tickets: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 1, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 12.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 12.5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 42%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 42, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 0, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 3
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-19';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-19', 3, NOW(), NOW());

    -- =====================================================
    -- Week: May 12 - May 18, 2025 (Last column from the table)
    -- =====================================================
    RAISE NOTICE 'Adding data for week May 12 - May 18, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Tickets per week: 22
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 22, NOW(), NOW());
    
    -- Tickets: < 5-days old: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 2, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 1, NOW(), NOW());
    
    -- After Hours Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 4.5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 4.5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 58%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 58, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 0, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-05-12';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-05-12', 2, NOW(), NOW());

    -- Count total scores added
    SELECT COUNT(DISTINCT ss.week_date) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.team_id = it_team_id;

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Successfully added all historical data for % weeks', v_count;
    RAISE NOTICE '=====================================================';

END $$;

COMMIT;

-- =====================================================
-- Final Verification Query - Check all weeks of data
-- =====================================================
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores,
    SUM(CASE WHEN sm.comparison_operator = 'greater_equal' AND ss.value >= sm.goal THEN 1
             WHEN sm.comparison_operator = 'less_equal' AND ss.value <= sm.goal THEN 1
             WHEN sm.comparison_operator = 'equal' AND ss.value = sm.goal THEN 1
             ELSE 0 END) as goals_met,
    ROUND(100.0 * SUM(CASE WHEN sm.comparison_operator = 'greater_equal' AND ss.value >= sm.goal THEN 1
             WHEN sm.comparison_operator = 'less_equal' AND ss.value <= sm.goal THEN 1
             WHEN sm.comparison_operator = 'equal' AND ss.value = sm.goal THEN 1
             ELSE 0 END) / COUNT(*), 1) as percent_goals_met
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;