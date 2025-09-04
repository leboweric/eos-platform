-- SQL to check which Leadership Team is actually being used for VITAL Worklife
-- Run this in pgAdmin to determine which team to keep

-- 1. First, find both leadership teams for the organization
SELECT 
    t.id,
    t.name,
    t.is_leadership_team,
    t.created_at,
    o.name as org_name
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE o.name LIKE '%VITAL%'
  AND t.is_leadership_team = true
ORDER BY t.created_at;

-- 2. Check which team has more associated data (rocks/priorities)
SELECT 
    t.name as team_name,
    t.id as team_id,
    COUNT(DISTINCT qp.id) as rock_count,
    COUNT(DISTINCT tm.user_id) as member_count,
    MAX(qp.created_at) as latest_rock_created
FROM teams t
LEFT JOIN quarterly_priorities qp ON qp.team_id = t.id
LEFT JOIN team_members tm ON tm.team_id = t.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.name LIKE '%VITAL%'
  AND t.is_leadership_team = true
GROUP BY t.id, t.name
ORDER BY rock_count DESC;

-- 3. Check which team has active users/members
SELECT 
    t.name as team_name,
    t.id as team_id,
    u.email,
    u.first_name,
    u.last_name,
    tm.role
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON tm.user_id = u.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.name LIKE '%VITAL%'
  AND t.is_leadership_team = true
ORDER BY t.name, u.email;

-- 4. Check for any issues, todos, or scorecard metrics
SELECT 
    t.name as team_name,
    COUNT(DISTINCT i.id) as issue_count,
    COUNT(DISTINCT td.id) as todo_count,
    COUNT(DISTINCT sm.id) as metric_count
FROM teams t
LEFT JOIN issues i ON i.team_id = t.id
LEFT JOIN todos td ON td.team_id = t.id
LEFT JOIN scorecard_metrics sm ON sm.team_id = t.id
JOIN organizations o ON t.organization_id = o.id
WHERE o.name LIKE '%VITAL%'
  AND t.is_leadership_team = true
GROUP BY t.id, t.name;

-- After running these queries, you'll know:
-- 1. Which team was created first (likely "Leadership Team for VITAL Worklife")
-- 2. Which team has actual data (rocks, issues, todos, metrics)
-- 3. Which team has active members

-- TO DELETE THE UNUSED TEAM (after verification):
-- Replace 'team_id_to_delete' with the actual UUID of the team you want to remove
-- 
-- DELETE FROM teams 
-- WHERE id = 'team_id_to_delete' 
-- AND is_leadership_team = true;
--
-- Note: This will cascade delete any associated data due to foreign key constraints