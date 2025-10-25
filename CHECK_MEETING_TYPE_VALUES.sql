-- Check what meeting types are actually stored in the database
SELECT DISTINCT 
  meeting_type,
  COUNT(*) as count
FROM meeting_snapshots
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
GROUP BY meeting_type
ORDER BY meeting_type;

-- Check if there are any meeting types with special characters
SELECT 
  meeting_type,
  LENGTH(meeting_type) as length,
  meeting_type LIKE '%t_1%' as contains_t1,
  meeting_type LIKE '%t1%' as contains_t1_no_underscore
FROM meeting_snapshots
WHERE organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
LIMIT 10;

-- Try the query with the value the frontend is sending  
SELECT COUNT(*)
FROM meeting_snapshots ms
LEFT JOIN teams t ON ms.team_id = t.id
LEFT JOIN users u ON ms.facilitator_id = u.id
WHERE ms.organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND ms.team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
  AND ms.meeting_type = 'weekly_accountability';  -- Frontend sends this

-- Try with the value the user showed in logs
SELECT COUNT(*)
FROM meeting_snapshots ms
LEFT JOIN teams t ON ms.team_id = t.id
LEFT JOIN users u ON ms.facilitator_id = u.id
WHERE ms.organization_id = '0adb33e9-c423-43bf-97ce-411d4bdc832d'
  AND ms.team_id = 'e621f912-d26e-4498-90f6-b287782b3a31'
  AND ms.meeting_type = 'Weekly Accountability';  -- User's logs show this