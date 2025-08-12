-- =====================================================
-- CHECK WHO OWNS THE SPECIAL UUID
-- =====================================================

-- See which organization currently owns the special UUID
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.organization_id,
  o.name as org_name,
  o.slug as org_slug,
  t.is_leadership_team
FROM teams t
JOIN organizations o ON t.organization_id = o.id
WHERE t.id = '00000000-0000-0000-0000-000000000000';

-- Check if demo org already has it
SELECT 
  'Demo Org Leadership Team:' as info,
  id,
  name,
  is_leadership_team
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND is_leadership_team = true;