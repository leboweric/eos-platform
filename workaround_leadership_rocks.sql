-- =====================================================
-- WORKAROUND: Mark rocks as coming from Leadership Team
-- =====================================================

-- Check if is_from_leadership column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities' 
  AND column_name = 'is_from_leadership';

-- If the column exists, we could try setting it
-- But it's probably not in the table...

-- Alternative: Check what departments the demo org has
SELECT 
  id,
  name,
  is_leadership_team,
  CASE 
    WHEN is_leadership_team = true THEN 'This is the Leadership Team'
    ELSE 'Regular Department'
  END as team_type
FROM teams
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
ORDER BY is_leadership_team DESC, name;

-- The real issue is the frontend hardcoding. 
-- For demo purposes, we have a few options:

-- Option 1: Create department-level rocks that will show
-- These are already created and associated with departments

-- Option 2: Document that Company rocks won't show in demo
-- due to technical limitations

-- Let's at least make sure department rocks are visible
-- Check Sales department rocks
SELECT 
  qp.title,
  qp.quarter || ' ' || qp.year as period,
  t.name as team_name
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND t.name IN ('Sales', 'Marketing')
  AND qp.quarter = 'Q3'
  AND qp.year = 2025;