-- =====================================================
-- Verify IT Team Scorecard Data
-- =====================================================

-- 1. Check current date and 13-week window
SELECT 
    CURRENT_DATE as today,
    DATE_TRUNC('week', CURRENT_DATE) as current_week_start,
    DATE_TRUNC('week', CURRENT_DATE - INTERVAL '13 weeks') as thirteen_weeks_ago;

-- 2. Check if we have ANY scores for IT Team
SELECT 
    COUNT(*) as total_scores,
    MIN(ss.week_date) as earliest_date,
    MAX(ss.week_date) as latest_date,
    COUNT(DISTINCT ss.week_date) as unique_weeks
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428';

-- 3. Show all weeks with data
SELECT 
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_scores,
    CASE 
        WHEN ss.week_date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '13 weeks') 
        THEN 'Within 13-week window'
        ELSE 'Outside window - TOO OLD'
    END as display_status
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;

-- 4. Check a specific recent week's data in detail
SELECT 
    sm.name as metric_name,
    sm.goal,
    ss.value,
    ss.week_date
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
  AND ss.week_date = '2025-07-28'
ORDER BY sm.name;

-- 5. Check if there's a mismatch between metric IDs
SELECT 
    'Metrics without scores' as check_type,
    sm.id,
    sm.name
FROM scorecard_metrics sm
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
  AND NOT EXISTS (
    SELECT 1 FROM scorecard_scores ss 
    WHERE ss.metric_id = sm.id
  );

-- 6. Check the actual metric IDs we're trying to insert scores for
SELECT 
    sm.id,
    sm.name,
    CASE 
        WHEN sm.name = 'Individual - Helpdesk Hours (Target: 10)' THEN 'Should have scores'
        WHEN sm.name = 'Individual - Helpdesk Hours (Target: 8)' THEN 'Should have scores'
        WHEN sm.name = 'Individual - Helpdesk Hours' THEN 'Third Individual metric?'
        ELSE 'Regular metric'
    END as status
FROM scorecard_metrics sm
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
ORDER BY sm.name;