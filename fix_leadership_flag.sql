-- Fix Leadership Team flag for Boyum Barenscheer

-- 1. Check current is_leadership_team status
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
AND t.id = '00000000-0000-0000-0000-000000000000';

-- 2. Update the flag to true
UPDATE teams 
SET is_leadership_team = true
WHERE id = '00000000-0000-0000-0000-000000000000'
AND organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- 3. Verify the update worked
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
AND t.id = '00000000-0000-0000-0000-000000000000';

-- 4. Also check which users are logged in to ensure they're assigned correctly
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    tm.team_id
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
WHERE u.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
ORDER BY u.email;