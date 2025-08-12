-- =====================================================
-- ADJUST: Set only 2 as Company Rocks, rest as Individual
-- =====================================================

-- First, set all Leadership Team rocks to individual (is_company_priority = false)
UPDATE quarterly_priorities qp
SET is_company_priority = false
FROM teams t
WHERE qp.team_id = t.id
  AND t.is_leadership_team = true
  AND qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001';

-- Now set only 2 specific rocks as Company priorities
-- These are the most strategic, company-wide initiatives
UPDATE quarterly_priorities
SET is_company_priority = true
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND title IN (
    'Launch Version 3.0 Platform',
    'Achieve $20M Q1 Revenue'
  );

-- Remove the test rock
DELETE FROM quarterly_priorities
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND title = 'TEST ROCK - DELETE ME';

-- Verify the split
SELECT 
  'Rock Distribution:' as info,
  SUM(CASE WHEN is_company_priority = true THEN 1 ELSE 0 END) as company_rocks,
  SUM(CASE WHEN is_company_priority = false THEN 1 ELSE 0 END) as individual_rocks
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND t.is_leadership_team = true
  AND qp.quarter = 'Q3'
  AND qp.year = 2025;

-- Show the final categorization
SELECT 
  qp.title,
  CASE 
    WHEN qp.is_company_priority = true THEN 'COMPANY'
    ELSE 'INDIVIDUAL'
  END as rock_type,
  u.first_name || ' ' || u.last_name as owner,
  qp.status
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND t.is_leadership_team = true
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
ORDER BY qp.is_company_priority DESC, qp.title;