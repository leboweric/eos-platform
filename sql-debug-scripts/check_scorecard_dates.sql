-- Check what dates the scorecard UI might be expecting
-- The UI typically shows the last 13 weeks

-- 1. Get current date info
SELECT 
    CURRENT_DATE as today,
    DATE_TRUNC('week', CURRENT_DATE) as current_week_start,
    DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '13 weeks' as thirteen_weeks_ago;

-- 2. Check what dates we have data for IT Team
SELECT DISTINCT
    ss.week_date,
    TO_CHAR(ss.week_date, 'Mon DD, YYYY') as formatted_date,
    COUNT(*) as metrics_with_data
FROM scorecard_scores ss
JOIN scorecard_metrics sm ON ss.metric_id = sm.id
WHERE sm.team_id = 'a5659c12-47cd-43e5-8441-19e0ab0ba428'
GROUP BY ss.week_date
ORDER BY ss.week_date DESC;

-- 3. Generate the last 13 weeks that UI would expect (from today)
SELECT 
    DATE_TRUNC('week', CURRENT_DATE - (n * INTERVAL '1 week')) as week_start,
    TO_CHAR(DATE_TRUNC('week', CURRENT_DATE - (n * INTERVAL '1 week')), 'Mon DD') as display_date
FROM generate_series(0, 12) n
ORDER BY week_start DESC;

-- 4. Check if the issue is that July 28, 2024 is too old
SELECT 
    '2024-07-28'::DATE as our_data_date,
    CURRENT_DATE - '2024-07-28'::DATE as days_ago,
    CASE 
        WHEN '2024-07-28'::DATE >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '13 weeks') 
        THEN 'Within 13 week window'
        ELSE 'Outside 13 week window - TOO OLD'
    END as status;