-- Final cleanup for Field Outdoor Spaces - remove the last orphaned blueprint

-- This blueprint has team_id = Leadership Team ID, which is wrong
-- Leadership Teams should use org-level blueprints (team_id = NULL)
DELETE FROM business_blueprints 
WHERE id = '1eb011f2-6464-4e90-9f33-5477a6168e9d';

-- Verify Field Outdoor Spaces now has the correct structure
SELECT 
    'Final Field Outdoor Spaces structure:' as check,
    o.name as org_name,
    COUNT(DISTINCT t.id) as total_teams,
    COUNT(DISTINCT CASE WHEN t.is_leadership_team THEN t.id END) as leadership_teams,
    COUNT(DISTINCT bb.id) as total_blueprints,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NULL THEN bb.id END) as org_level_blueprints,
    COUNT(DISTINCT CASE WHEN bb.team_id IS NOT NULL THEN bb.id END) as team_level_blueprints,
    COUNT(DISTINCT tp.id) as three_year_pictures
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id
LEFT JOIN business_blueprints bb ON bb.organization_id = o.id
LEFT JOIN three_year_pictures tp ON tp.vto_id = bb.id
WHERE o.name = 'Field Outdoor Spaces'
GROUP BY o.name;

-- Should show:
-- 1 team (Leadership)
-- 1 blueprint (org-level)
-- 1 three_year_picture