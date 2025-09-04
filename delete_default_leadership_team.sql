-- Delete the unused "Default Leadership Team" for VITAL Worklife
-- The active team "Leadership Team" (f04ca1c9-392e-4e65-b7f9-c0a924fc58bc) will be kept

-- First, find the Default Leadership Team to confirm it exists and get its ID
SELECT 
    id,
    name,
    is_leadership_team,
    created_at
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
  AND name = 'Default Leadership Team'
  AND is_leadership_team = true;

-- If the above query returns a result, copy the ID and use it below
-- DELETE the unused Default Leadership Team
-- Note: Replace 'default_team_id_here' with the actual ID from the query above

-- DELETE FROM teams 
-- WHERE id = 'default_team_id_here'
--   AND name = 'Default Leadership Team'
--   AND is_leadership_team = true;

-- Alternative: If you want to be extra safe, just remove the leadership flag instead of deleting
-- This keeps the team but makes it a regular team instead of a leadership team

-- UPDATE teams 
-- SET is_leadership_team = false
-- WHERE name = 'Default Leadership Team'
--   AND organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%');

-- After running either DELETE or UPDATE, verify only one leadership team remains:
SELECT 
    id,
    name,
    is_leadership_team
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE name LIKE '%VITAL%')
  AND is_leadership_team = true;