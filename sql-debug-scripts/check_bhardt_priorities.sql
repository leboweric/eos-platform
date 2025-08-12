-- Check bhardt@myboyum.com priorities and team assignments
-- First get the user details
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.organization_id
FROM users u
WHERE u.email = 'bhardt@myboyum.com';

-- Check team memberships
SELECT 
    u.email,
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team,
    tm.role
FROM users u
JOIN team_members tm ON tm.user_id = u.id
JOIN teams t ON t.id = tm.team_id
WHERE u.email = 'bhardt@myboyum.com';

-- Check priorities assigned to bhardt
SELECT 
    p.id as priority_id,
    p.title,
    p.status,
    p.is_company_priority,
    p.team_id,
    t.name as team_name,
    t.is_leadership_team,
    p.owner_id,
    u.email as owner_email,
    p.deleted_at
FROM quarterly_priorities p
LEFT JOIN teams t ON t.id = p.team_id
LEFT JOIN users u ON u.id = p.owner_id
WHERE u.email = 'bhardt@myboyum.com'
  AND p.deleted_at IS NULL
ORDER BY p.created_at DESC;

-- Check all priorities for the organization to see context
SELECT 
    p.title,
    p.is_company_priority,
    p.team_id,
    t.name as team_name,
    u.email as owner_email,
    p.status,
    p.deleted_at
FROM quarterly_priorities p
JOIN organizations o ON o.id = p.organization_id
LEFT JOIN teams t ON t.id = p.team_id
LEFT JOIN users u ON u.id = p.owner_id
WHERE o.slug = 'boyum'
  AND p.deleted_at IS NULL
ORDER BY p.is_company_priority DESC, p.created_at DESC;