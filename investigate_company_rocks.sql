-- =====================================================
-- INVESTIGATE HOW COMPANY ROCKS WORK FOR OTHER ORGS
-- =====================================================

-- 1. Check all Leadership Teams and their IDs
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.is_leadership_team,
  o.name as org_name,
  o.slug as org_slug
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.is_leadership_team = true
ORDER BY o.name;

-- 2. Check how Company rocks are stored for Boyum (who has the special UUID)
SELECT 
  'Boyum Company Rocks:' as check,
  qp.title,
  qp.team_id,
  t.name as team_name,
  t.is_leadership_team
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND t.is_leadership_team = true
LIMIT 5;

-- 3. Check other orgs that might have Company rocks
SELECT 
  'Company Rocks by Org:' as check,
  o.name as org_name,
  COUNT(qp.id) as rock_count,
  t.id as leadership_team_id
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
JOIN organizations o ON qp.organization_id = o.id
WHERE t.is_leadership_team = true
GROUP BY o.name, t.id
ORDER BY rock_count DESC;

-- 4. Key insight: Check if each org has their own Leadership Team
-- The frontend might be checking is_leadership_team flag, not the UUID!
SELECT 
  'Organizations with Leadership Teams:' as check,
  COUNT(DISTINCT o.id) as org_count,
  COUNT(DISTINCT t.id) as leadership_team_count
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id AND t.is_leadership_team = true;

-- 5. Check how the demo org's Leadership Team rocks are stored
SELECT 
  'Demo Org Rocks Storage:' as check,
  qp.id,
  qp.title,
  qp.team_id,
  t.id as actual_team_id,
  t.name,
  t.is_leadership_team,
  CASE 
    WHEN qp.team_id = t.id THEN 'IDs Match'
    ELSE 'ID MISMATCH!'
  END as id_check
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND t.is_leadership_team = true;