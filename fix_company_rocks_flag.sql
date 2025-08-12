-- =====================================================
-- FIX: ADD is_company_priority FLAG TO COMPANY ROCKS
-- =====================================================

-- Check if the column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities' 
  AND column_name = 'is_company_priority';

-- Add the column if it doesn't exist
ALTER TABLE quarterly_priorities 
ADD COLUMN IF NOT EXISTS is_company_priority BOOLEAN DEFAULT false;

-- Update all Leadership Team rocks to be Company priorities
UPDATE quarterly_priorities qp
SET is_company_priority = true
FROM teams t
WHERE qp.team_id = t.id
  AND t.is_leadership_team = true
  AND qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001';

-- Verify the update
SELECT 
  'Company Rocks with Flag Set:' as status,
  COUNT(*) as count,
  STRING_AGG(title, ', ') as titles
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND t.is_leadership_team = true
  AND qp.is_company_priority = true
  AND qp.quarter = 'Q3'
  AND qp.year = 2025;

-- Double check the flags
SELECT 
  qp.title,
  qp.is_company_priority,
  t.name as team_name,
  t.is_leadership_team
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
ORDER BY t.is_leadership_team DESC, qp.title;