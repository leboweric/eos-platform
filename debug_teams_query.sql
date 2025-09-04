-- Debug query to find ALL teams for VITAL Worklife
-- This will help us see what's actually in the database

-- 1. Get the organization ID first
SELECT id, name 
FROM organizations 
WHERE name LIKE '%VITAL%';

-- 2. Show ALL teams for VITAL (not just leadership teams)
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    t.parent_team_id,
    t.created_at,
    CASE 
        WHEN t.deleted_at IS NOT NULL THEN 'DELETED'
        ELSE 'ACTIVE'
    END as status,
    t.deleted_at
FROM teams t
WHERE t.organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
ORDER BY t.is_leadership_team DESC, t.name;

-- 3. Check if there might be duplicate team names with different IDs
SELECT 
    name,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as team_ids,
    STRING_AGG(CASE WHEN is_leadership_team THEN 'LEADERSHIP' ELSE 'REGULAR' END, ', ') as types
FROM teams
WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
  AND (deleted_at IS NULL OR deleted_at IS NOT NULL)  -- Include soft-deleted
GROUP BY name
HAVING COUNT(*) > 1;

-- 4. Check for any teams with similar names (case sensitivity, spaces, etc)
SELECT 
    id,
    name,
    LENGTH(name) as name_length,
    is_leadership_team,
    deleted_at
FROM teams
WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
  AND (LOWER(name) LIKE '%leadership%' OR LOWER(name) LIKE '%default%')
ORDER BY name;

-- 5. Check team_members table to see all team assignments
SELECT 
    t.name as team_name,
    t.is_leadership_team,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
GROUP BY t.id, t.name, t.is_leadership_team
ORDER BY t.is_leadership_team DESC, member_count DESC;