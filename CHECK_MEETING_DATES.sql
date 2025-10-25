-- Debug query to check meeting_date values in snapshots
-- Run this in pgAdmin to see what's actually in the database

-- Check date values for the specific team
SELECT 
  id,
  meeting_date,
  meeting_date IS NULL as is_null,
  created_at,
  meeting_type,
  duration_minutes
FROM meeting_snapshots
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
ORDER BY created_at DESC
LIMIT 10;

-- Check date range
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(meeting_date) as snapshots_with_dates,
  COUNT(*) - COUNT(meeting_date) as snapshots_without_dates,
  MIN(meeting_date) as earliest_date,
  MAX(meeting_date) as latest_date
FROM meeting_snapshots
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31';

-- Test the exact query with date filters
SELECT COUNT(*)
FROM meeting_snapshots
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
  AND meeting_date::date >= '2025-10-20'::date
  AND meeting_date::date <= '2025-10-24'::date;