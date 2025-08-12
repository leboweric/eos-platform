-- Check what teams Field Outdoor Spaces has and their blueprints

-- 1. All teams for Field Outdoor Spaces
SELECT 
    'Field Outdoor Spaces Teams:' as check,
    t.id,
    t.name,
    t.is_leadership_team,
    t.created_at::date as created_date,
    t.created_at::time as created_time
FROM teams t
WHERE t.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY t.created_at;

-- 2. All blueprints for Field Outdoor Spaces with team details
SELECT 
    'Field Outdoor Spaces Blueprints:' as check,
    bb.id as blueprint_id,
    bb.team_id,
    t.name as team_name,
    t.is_leadership_team,
    bb.created_at::date as created_date,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (for Leadership)'
        WHEN t.is_leadership_team = true THEN 'WRONG - Leadership with team_id'
        ELSE 'DEPARTMENT-LEVEL'
    END as blueprint_type
FROM business_blueprints bb
LEFT JOIN teams t ON t.id = bb.team_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY bb.created_at;

-- 3. Check if there's an orphaned blueprint (team was deleted but blueprint remains)
SELECT 
    'Orphaned blueprints (team deleted):' as check,
    bb.id as blueprint_id,
    bb.team_id as missing_team_id,
    bb.created_at
FROM business_blueprints bb
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM teams t 
      WHERE t.id = bb.team_id
  );

-- 4. If there's a non-leadership team, check if it has any members
SELECT 
    'Team members for non-leadership teams:' as check,
    t.name as team_name,
    t.id as team_id,
    COUNT(tm.user_id) as member_count
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
WHERE t.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND t.is_leadership_team = false
GROUP BY t.id, t.name;