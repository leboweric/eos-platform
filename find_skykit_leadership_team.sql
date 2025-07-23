-- Find the actual Leadership Team for Skykit
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.organization_id,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.id = '22c2e9d6-3518-4aa3-b945-c9580d638457'
ORDER BY t.name;

-- Show the mismatch: metrics are assigned to a team that doesn't belong to Skykit
SELECT 
    '47d53797-be5f-49c2-883a-326a401a17c1' as hardcoded_leadership_team_id,
    t.organization_id as team_belongs_to_org,
    o.name as org_name
FROM teams t
LEFT JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '47d53797-be5f-49c2-883a-326a401a17c1';