-- Fix queries for Mike Majerus access issues
-- Run the investigation queries first to understand the issue, then run the appropriate fix

-- Option 1: If Mike is not assigned to any team, add him to the main team
-- First, find the main team for Skykit
SELECT id, name, department_id 
FROM teams 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit');

-- Then add Mike to the team (replace TEAM_ID with the actual team ID from above)
/*
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    'TEAM_ID', -- Replace with actual team ID
    u.id,
    'member', -- or 'leader' if he should be a team leader
    NOW(),
    NOW()
FROM users u
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');
*/

-- Option 2: If Mike needs to be in the same team as other users who can see data
-- This query will show which teams have the most users
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name,
    COUNT(DISTINCT tm.user_id) as member_count
FROM teams t
LEFT JOIN departments d ON t.department_id = d.id
LEFT JOIN team_members tm ON t.id = tm.team_id
WHERE t.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY t.id, t.name, t.department_id, d.name
ORDER BY member_count DESC;

-- Option 3: Complete fix - Add Mike to the primary team with most users
-- Uncomment and run after identifying the correct team
/*
WITH mike_user AS (
    SELECT id, organization_id 
    FROM users 
    WHERE email LIKE '%majerus%' OR (first_name = 'Mike' AND last_name = 'Majerus')
    LIMIT 1
),
primary_team AS (
    SELECT t.id as team_id
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.organization_id = (SELECT organization_id FROM mike_user)
    GROUP BY t.id
    ORDER BY COUNT(DISTINCT tm.user_id) DESC
    LIMIT 1
)
INSERT INTO team_members (id, team_id, user_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    pt.team_id,
    mu.id,
    'member',
    NOW(),
    NOW()
FROM mike_user mu, primary_team pt
WHERE NOT EXISTS (
    SELECT 1 FROM team_members 
    WHERE user_id = mu.id AND team_id = pt.team_id
);
*/

-- Option 4: If the issue is with department context
-- Check if Mike needs a primary team assignment
/*
UPDATE team_members
SET is_primary = true, updated_at = NOW()
WHERE user_id = (
    SELECT id FROM users 
    WHERE email LIKE '%majerus%' OR (first_name = 'Mike' AND last_name = 'Majerus')
)
AND team_id = 'TEAM_ID'; -- Replace with the correct team ID
*/

-- Verification query to run after fix
SELECT 
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    u.role as user_role,
    tm.team_id,
    t.name as team_name,
    tm.role as team_role,
    tm.is_primary,
    d.name as department_name
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE u.email LIKE '%majerus%' OR (u.first_name = 'Mike' AND u.last_name = 'Majerus');