-- Complete debugging for t_1 error

-- 1. Check if meeting_snapshots is a table or view
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'meeting_snapshots';

-- 2. Check if there are any views that reference meeting_snapshots
SELECT 
  viewname,
  definition
FROM pg_views
WHERE definition LIKE '%meeting_snapshots%';

-- 3. Try the exact query the backend would generate WITH meeting type
-- This is what the backend generates when all filters are applied:
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
  AND ms.meeting_type = 'weekly_accountability'::text
  AND ms.meeting_date::date >= '2025-10-20'::date
  AND ms.meeting_date::date <= '2025-10-24'::date
ORDER BY ms.meeting_date DESC 
LIMIT 50 OFFSET 0;

-- 4. Check if parameterized version causes issues
PREPARE test_query (uuid, uuid, text, date, date, int, int) AS
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
WHERE ms.organization_id = $1
  AND ms.team_id = $2
  AND ms.meeting_type = $3::text
  AND ms.meeting_date::date >= $4::date
  AND ms.meeting_date::date <= $5::date
ORDER BY ms.meeting_date DESC 
LIMIT $6 OFFSET $7;

EXECUTE test_query(
  '0adb33e9-c423-43bf-97ce-411d4bdc832d',
  'e621f912-d26e-4498-90f6-b287782b3a31',
  'weekly_accountability',
  '2025-10-20',
  '2025-10-24',
  50,
  0
);

DEALLOCATE test_query;

-- 5. Check if there's something wrong with the teams table join
SELECT 
  t.id,
  t.name,
  COUNT(*) as usage_count
FROM teams t
WHERE t.id = 'e621f912-d26e-4498-90f6-b287782b3a31'
GROUP BY t.id, t.name;

-- 6. Simpler test - just the meeting type filter
SELECT COUNT(*)
FROM meeting_snapshots ms
WHERE ms.organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND ms.team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
  AND ms.meeting_type = 'weekly_accountability';