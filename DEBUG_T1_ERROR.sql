-- Debug the t_1 error
-- Test the exact query that's failing

-- First, check what meeting types exist
SELECT DISTINCT meeting_type 
FROM meeting_snapshots 
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31';

-- Try the exact query that the backend is generating with meeting type filter
SELECT 
  ms.id,
  ms.meeting_id,
  ms.team_id,
  ms.meeting_type,
  ms.meeting_date,
  ms.duration_minutes,
  ms.average_rating,
  ms.snapshot_data,
  ms.created_at,
  t.name as team_name,
  u.first_name || ' ' || u.last_name as facilitator_name,
  COUNT(*) OVER() as total_count
FROM meeting_snapshots ms
LEFT JOIN teams t ON ms.team_id = t.id
LEFT JOIN users u ON ms.facilitator_id = u.id
WHERE ms.organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND ms.team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
  AND ms.meeting_type = 'Weekly Accountability'
  AND ms.meeting_date::date >= '2025-10-20'::date
  AND ms.meeting_date::date <= '2025-10-24'::date
ORDER BY ms.meeting_date DESC 
LIMIT 50 OFFSET 0;

-- Check if there's a database view or trigger that might be causing issues
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename LIKE '%meeting%' 
   OR tablename LIKE '%t_1%'
   OR tablename LIKE '%t1%';

-- Check for any views that might be interfering
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE viewname LIKE '%meeting%' 
   OR definition LIKE '%t_1%'
   OR definition LIKE '%t1%';