-- =====================================================
-- Update IT Team Scorecard Dates to Recent Window
-- =====================================================
-- The data was entered as 2024 but should be 2025
-- Today is August 10, 2025, so Jul 28, 2025 is within range

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    old_date DATE := '2024-07-28';
    new_date DATE := '2025-07-28';  -- Correct year
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
    
    RAISE NOTICE 'Updating scorecard dates from % to %', old_date, new_date;
    
    -- Update all scorecard_scores for IT Team metrics from old date to new date
    UPDATE scorecard_scores ss
    SET week_date = new_date
    FROM scorecard_metrics sm
    WHERE ss.metric_id = sm.id
      AND sm.organization_id = org_id
      AND sm.team_id = it_team_id
      AND ss.week_date = old_date;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % scorecard scores to new date', v_count;
    
    -- Verify the update
    SELECT COUNT(*) INTO v_count
    FROM scorecard_scores ss
    JOIN scorecard_metrics sm ON ss.metric_id = sm.id
    WHERE sm.organization_id = org_id
      AND sm.team_id = it_team_id
      AND ss.week_date = new_date;
    
    RAISE NOTICE 'IT Team now has % scores for date %', v_count, new_date;

END $$;

COMMIT;

-- =====================================================
-- Verification Query - Check the updated scores
-- =====================================================
SELECT 
    'Current 13-week window' as check_type,
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '13 weeks') as window_start,
    DATE_TRUNC('week', CURRENT_DATE) as window_end,
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '2 weeks') as new_score_date
UNION ALL
SELECT 
    'IT Team scores count' as check_type,
    NULL as window_start,
    NULL as window_end,
    ss.week_date as new_score_date
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
GROUP BY ss.week_date;

-- Show actual scores with their new date
SELECT 
    sm.name as metric_name,
    sm.goal,
    ss.value as actual_value,
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date
FROM scorecard_metrics sm
JOIN scorecard_scores ss ON sm.id = ss.metric_id
JOIN teams t ON sm.team_id = t.id
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND t.name = 'IT Team'
ORDER BY sm.name;