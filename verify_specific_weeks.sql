-- Check if we have data for the specific weeks shown in the UI header
-- Based on the spreadsheet: Aug 04, Aug 10, Jul 28, Jul 21, Jul 14, Jul 20, Jul 07, Jul 13, etc.

WITH weeks_needed AS (
  SELECT unnest(ARRAY[
    '2025-08-04'::date,
    '2025-08-10'::date,
    '2025-07-28'::date,
    '2025-08-03'::date,
    '2025-07-21'::date,
    '2025-07-27'::date,
    '2025-07-14'::date,
    '2025-07-20'::date,
    '2025-07-07'::date,
    '2025-07-13'::date,
    '2025-06-30'::date,
    '2025-07-06'::date,
    '2025-06-23'::date,
    '2025-06-29'::date,
    '2025-06-16'::date,
    '2025-06-22'::date,
    '2025-06-09'::date,
    '2025-06-15'::date,
    '2025-06-02'::date,
    '2025-06-08'::date,
    '2025-05-28'::date,
    '2025-06-01'::date,
    '2025-05-19'::date,
    '2025-05-25'::date,
    '2025-05-12'::date,
    '2025-05-18'::date
  ]) AS week_date
)
SELECT 
  wn.week_date,
  sm.name as metric_name,
  ss.value
FROM weeks_needed wn
CROSS JOIN scorecard_metrics sm
LEFT JOIN scorecard_scores ss ON ss.metric_id = sm.id AND ss.week_date = wn.week_date
WHERE sm.organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND sm.team_id = '00000000-0000-0000-0000-000000000000'
  AND sm.name IN ('Revenue Per FTE', 'YTD Billing Realization', 'Cash Balance')
ORDER BY wn.week_date DESC, sm.display_order
LIMIT 50;