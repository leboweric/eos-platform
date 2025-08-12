-- Investigate why Field Outdoor Spaces has duplicate VTOs

-- 1. Check all teams for Field Outdoor Spaces
SELECT 
    'Field Outdoor Spaces Teams:' as check,
    t.id,
    t.name,
    t.is_leadership_team,
    t.created_at
FROM teams t
WHERE t.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY t.created_at;

-- 2. Check all business_blueprints for Field Outdoor Spaces
SELECT 
    'Field Outdoor Spaces Blueprints:' as check,
    bb.id,
    bb.team_id,
    bb.created_at,
    bb.updated_at,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (Correct for Leadership)'
        WHEN bb.team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' THEN 'TEAM-LEVEL (WRONG - Leadership should be NULL)'
        ELSE 'OTHER TEAM'
    END as blueprint_type
FROM business_blueprints bb
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY bb.created_at;

-- 3. Check other organizations to see if this is a widespread problem
SELECT 
    'Organizations with duplicate blueprints:' as check,
    o.name as org_name,
    COUNT(DISTINCT bb.id) as blueprint_count,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) as org_level_count,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) as team_level_count,
    STRING_AGG(DISTINCT 
        CASE 
            WHEN bb.team_id IS NULL THEN 'ORG-LEVEL'
            WHEN t.is_leadership_team THEN 'LEADERSHIP-TEAM-LEVEL (WRONG!)'
            ELSE 'DEPARTMENT-LEVEL'
        END, ', '
    ) as blueprint_types
FROM organizations o
JOIN business_blueprints bb ON bb.organization_id = o.id
LEFT JOIN teams t ON t.id = bb.team_id
GROUP BY o.id, o.name
HAVING COUNT(DISTINCT bb.id) > 1
ORDER BY blueprint_count DESC;

-- 4. Find all organizations where Leadership Team has a team-level VTO (WRONG)
SELECT 
    'Orgs with wrong Leadership Team VTOs:' as check,
    o.name as org_name,
    t.name as team_name,
    t.id as team_id,
    t.is_leadership_team,
    bb.id as blueprint_id,
    bb.team_id as blueprint_team_id,
    bb.created_at
FROM business_blueprints bb
JOIN teams t ON t.id = bb.team_id
JOIN organizations o ON o.id = bb.organization_id
WHERE t.is_leadership_team = true
  AND bb.team_id IS NOT NULL;  -- This should be NULL for leadership teams

-- 5. Check when these were created to understand if it's a recent bug
SELECT 
    'Blueprint creation timeline:' as check,
    DATE(bb.created_at) as created_date,
    COUNT(*) as blueprints_created,
    COUNT(CASE WHEN bb.team_id IS NULL THEN 1 END) as org_level,
    COUNT(CASE WHEN bb.team_id IS NOT NULL AND t.is_leadership_team THEN 1 END) as wrong_leadership,
    COUNT(CASE WHEN bb.team_id IS NOT NULL AND NOT t.is_leadership_team THEN 1 END) as correct_department
FROM business_blueprints bb
LEFT JOIN teams t ON t.id = bb.team_id
GROUP BY DATE(bb.created_at)
ORDER BY created_date DESC
LIMIT 30;

-- 6. The fix: Delete the incorrect team-level blueprint for Leadership Teams
-- This should be run for all affected organizations
/*
DELETE FROM business_blueprints bb
USING teams t
WHERE bb.team_id = t.id
  AND t.is_leadership_team = true
  AND bb.team_id IS NOT NULL
  AND EXISTS (
      -- Only delete if there's already an org-level blueprint
      SELECT 1 FROM business_blueprints bb2 
      WHERE bb2.organization_id = bb.organization_id 
      AND bb2.team_id IS NULL
  );
*/