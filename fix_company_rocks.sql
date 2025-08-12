-- =====================================================
-- FIX COMPANY ROCKS TO USE LEADERSHIP TEAM ID
-- =====================================================

-- First, let's see what we have
SELECT 
  qp.id,
  qp.title,
  qp.team_id,
  t.name as team_name,
  t.is_leadership_team
FROM quarterly_priorities qp
LEFT JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.quarter = 'Q1'
  AND qp.year = 2025;

-- Update Company-level rocks (team_id = NULL) to use the Leadership Team ID
UPDATE quarterly_priorities
SET team_id = 'deeeeeee-1111-0000-0000-000000000001'  -- Leadership Team ID
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id IS NULL
  AND quarter = 'Q1'
  AND year = 2025;

-- Verify the update
SELECT 
  'Company Rocks Fixed:' as status,
  COUNT(*) as rocks_updated
FROM quarterly_priorities 
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id = 'deeeeeee-1111-0000-0000-000000000001'
  AND quarter = 'Q1'
  AND year = 2025;

-- Show all rocks after the fix
SELECT 
  qp.title,
  qp.status,
  t.name as team_name,
  t.is_leadership_team,
  u.first_name || ' ' || u.last_name as owner_name
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.quarter = 'Q1'
  AND qp.year = 2025
ORDER BY t.is_leadership_team DESC, qp.created_at;