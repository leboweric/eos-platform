-- =====================================================
-- DEBUG WHY DEMO ORG ROCKS DON'T SHOW
-- =====================================================

-- 1. Check Jane's team membership
SELECT 
  'Jane Team Membership:' as check,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  tm.team_id,
  t.name as team_name,
  t.is_leadership_team
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'demo@acme.com';

-- 2. Compare with a working org (e.g., Bennett)
SELECT 
  'Bennett Admin Team Membership:' as check,
  u.email,
  tm.team_id,
  t.name as team_name,
  t.is_leadership_team
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
  AND u.role = 'admin'
LIMIT 5;

-- 3. Check if Jane is on the Leadership Team
SELECT 
  'Is Jane on Leadership Team?' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN 'YES - Jane is on Leadership Team'
    ELSE 'NO - Jane is NOT on Leadership Team!'
  END as status
FROM team_members tm
JOIN teams t ON tm.team_id = t.id
WHERE tm.user_id = 'deeeeeee-2222-0000-0000-000000000001'
  AND t.is_leadership_team = true;

-- 4. Check the actual API call the frontend would make
-- The frontend calls: /organizations/{orgId}/teams/{teamId}/quarterly-priorities
-- For the demo org Leadership Team, that would be:
-- /organizations/deeeeeee-0000-0000-0000-000000000001/teams/deeeeeee-1111-0000-0000-000000000001/quarterly-priorities?quarter=Q3&year=2025

-- Let's simulate what that would return
SELECT 
  'Simulated API Response:' as check,
  COUNT(*) as rock_count
FROM quarterly_priorities qp
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.team_id = 'deeeeeee-1111-0000-0000-000000000001'
  AND qp.quarter = 'Q3'
  AND qp.year = 2025;

-- 5. Check if there's a department/team selection issue
SELECT 
  'All Demo Org Teams:' as check,
  id,
  name,
  is_leadership_team,
  CASE 
    WHEN id = 'deeeeeee-1111-0000-0000-000000000001' THEN 'This should be selected for Company view'
    ELSE 'Department'
  END as note
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
ORDER BY is_leadership_team DESC, name;