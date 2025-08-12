-- =====================================================
-- DEBUG ROCKS VISIBILITY ISSUE
-- =====================================================

-- 1. Check what rocks exist for demo org
SELECT 
  'All Rocks for Demo Org:' as check_type,
  qp.id,
  qp.title,
  qp.quarter || ' ' || qp.year as period,
  qp.team_id,
  t.name as team_name,
  t.is_leadership_team,
  qp.owner_id,
  u.first_name || ' ' || u.last_name as owner_name
FROM quarterly_priorities qp
LEFT JOIN teams t ON qp.team_id = t.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
ORDER BY qp.year DESC, qp.quarter DESC;

-- 2. Check if Leadership Team exists and is properly marked
SELECT 
  'Leadership Team Check:' as check_type,
  id,
  name,
  is_leadership_team,
  organization_id
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND is_leadership_team = true;

-- 3. Check if Jane (admin) is properly associated with the org
SELECT 
  'Jane User Check:' as check_type,
  id,
  email,
  first_name,
  last_name,
  organization_id,
  role
FROM users
WHERE email = 'demo@acme.com';

-- 4. Check if there are any deleted_at values blocking visibility
SELECT 
  'Deleted Rocks Check:' as check_type,
  COUNT(*) as total_rocks,
  SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted_rocks,
  SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) as active_rocks
FROM quarterly_priorities
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001';

-- 5. Let's create a simple test rock to see if new rocks show up
-- First delete any test rock if it exists
DELETE FROM quarterly_priorities 
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND title = 'TEST ROCK - DELETE ME';

-- Now create a test rock for current quarter
INSERT INTO quarterly_priorities (
    id, organization_id, team_id, title, description, owner_id, 
    due_date, status, quarter, year, created_at, updated_at
)
VALUES (
    gen_random_uuid(), 
    'deeeeeee-0000-0000-0000-000000000001', 
    'deeeeeee-1111-0000-0000-000000000001',  -- Leadership Team ID
    'TEST ROCK - DELETE ME', 
    'This is a test rock to verify visibility', 
    'deeeeeee-2222-0000-0000-000000000001',  -- Jane's ID
    '2025-09-30', 
    'on-track', 
    'Q3', 
    2025, 
    NOW(), 
    NOW()
);

-- 6. Check what the API would return for Q3 2025
SELECT 
  'What API Should Return for Q3 2025:' as check_type,
  COUNT(*) as rock_count,
  STRING_AGG(title, ', ') as rock_titles
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
  AND (qp.deleted_at IS NULL OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quarterly_priorities' 
    AND column_name = 'deleted_at'
  ));