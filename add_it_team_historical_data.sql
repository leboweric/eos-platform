-- =====================================================
-- Add IT Team Historical Scorecard Data
-- =====================================================
-- Adding all historical data from Jul 21, 2025 back to May 18, 2025

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
    
    RAISE NOTICE 'Adding historical scorecard data for IT Team (%)...', it_team_id;

    -- =====================================================
    -- Week: Jul 21 - Jul 27, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jul 21 - Jul 27, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- Automation - In Progress: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 1, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- Tickets per week: 31
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 31, NOW(), NOW());
    
    -- Tickets: < 5-days old: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 4, NOW(), NOW());
    
    -- Tickets: >30-days old: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 2, NOW(), NOW());
    
    -- After Hours Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 3.25
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 3.25, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 36%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 36, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 1, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-21';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-21', 0, NOW(), NOW());

    -- =====================================================
    -- Week: Jul 14 - Jul 20, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jul 14 - Jul 20, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- Automation - In Progress: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 1, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- Tickets per week: 24
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 24, NOW(), NOW());
    
    -- Tickets: < 5-days old: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 4, NOW(), NOW());
    
    -- Tickets: >30-days old: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 2, NOW(), NOW());
    
    -- After Hours Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 2.75
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 2.75, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 5, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 60%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 60, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 2, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-14';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-14', 1, NOW(), NOW());

    -- =====================================================
    -- Week: Jul 07 - Jul 13, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jul 07 - Jul 13, 2025';
    
    -- Automation - Completed: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 1, NOW(), NOW());
    
    -- Automation - In Progress: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 1, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 0, NOW(), NOW());
    
    -- Tickets per week: 27
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 27, NOW(), NOW());
    
    -- Tickets: < 5-days old: 3
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 3, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 1, NOW(), NOW());
    
    -- After Hours Tickets: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 1, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 9
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 9, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 5, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 82%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 82, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 10
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 10, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-07-07';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-07-07', 4, NOW(), NOW());

    -- =====================================================
    -- Week: Jun 30 - Jul 06, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jun 30 - Jul 06, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 1, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- Tickets per week: 15
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 15, NOW(), NOW());
    
    -- Tickets: < 5-days old: 7
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 7, NOW(), NOW());
    
    -- Tickets: >30-days old: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 4, NOW(), NOW());
    
    -- After Hours Tickets: 2
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 2, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 5, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 1, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 75%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 75, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-30';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-30', 0, NOW(), NOW());

    -- =====================================================
    -- Week: Jun 23 - Jun 29, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jun 23 - Jun 29, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- Automation - In Progress: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 1, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- Tickets per week: 30
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 30, NOW(), NOW());
    
    -- Tickets: < 5-days old: 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 5, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 1, NOW(), NOW());
    
    -- After Hours Tickets: 3
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 3, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 90%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 90, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 3
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 3, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 4
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-23';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-23', 4, NOW(), NOW());

    -- =====================================================
    -- Week: Jun 16 - Jun 22, 2025
    -- =====================================================
    RAISE NOTICE 'Adding data for week Jun 16 - Jun 22, 2025';
    
    -- Automation - Completed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Completed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- Automation - In Progress: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - In Progress';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- Automation - Suggestions: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Automation - Suggestions';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- CSAT - Neutral/Negative: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Neutral/Negative';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- CSAT - Positive: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'CSAT - Positive';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- Tickets per week: 9
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets per week';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 9, NOW(), NOW());
    
    -- Tickets: < 5-days old: 5
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: < 5-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 5, NOW(), NOW());
    
    -- Tickets: >30-days old: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Tickets: >30-days old';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 1, NOW(), NOW());
    
    -- After Hours Tickets: 1
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'After Hours Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 1, NOW(), NOW());
    
    -- Saturday Morning Tickets: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Saturday Morning Tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 10): 8.25
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 10)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 8.25, NOW(), NOW());
    
    -- Individual - Helpdesk Hours (Target: 8): 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Helpdesk Hours (Target: 8)';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- Individual - Daily touchpoints on tickets: 13%
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'Individual - Daily touchpoints on tickets';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 13, NOW(), NOW());
    
    -- FreshService IT Documents Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService IT Documents Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());
    
    -- FreshService Staff Articles Created/Updated/Reviewed: 0
    SELECT id INTO v_metric_id FROM scorecard_metrics 
    WHERE organization_id = org_id AND team_id = it_team_id AND name = 'FreshService Staff Articles Created/Updated/Reviewed';
    DELETE FROM scorecard_scores WHERE metric_id = v_metric_id AND week_date = '2025-06-16';
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at)
    VALUES (v_metric_id, '2025-06-16', 0, NOW(), NOW());

    -- Count total scores added
    SELECT COUNT(DISTINCT ss.week_date) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.team_id = it_team_id;

    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Successfully added historical data for % weeks', v_count;
    RAISE NOTICE '=====================================================';

END $$;

COMMIT;

-- =====================================================
-- Verification Query - Check all weeks of data
-- =====================================================
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores,
    SUM(CASE WHEN sm.comparison_operator = 'greater_equal' AND ss.value >= sm.goal THEN 1
             WHEN sm.comparison_operator = 'less_equal' AND ss.value <= sm.goal THEN 1
             WHEN sm.comparison_operator = 'equal' AND ss.value = sm.goal THEN 1
             ELSE 0 END) as goals_met
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;