-- =====================================================
-- CHECK AND FIX ROCKS QUARTER/YEAR
-- =====================================================

-- Check current date and quarter
SELECT 
  CURRENT_DATE as today,
  EXTRACT(QUARTER FROM CURRENT_DATE) as current_quarter_num,
  'Q' || EXTRACT(QUARTER FROM CURRENT_DATE) as current_quarter,
  EXTRACT(YEAR FROM CURRENT_DATE) as current_year;

-- See what rocks exist for the demo org
SELECT 
  quarter,
  year,
  COUNT(*) as rock_count,
  STRING_AGG(title, ', ') as rock_titles
FROM quarterly_priorities
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
GROUP BY quarter, year
ORDER BY year DESC, quarter DESC;

-- The current quarter is Q3 2025 (August 2025)
-- Let's update our rocks to be Q3 2025 instead of Q1 2025
UPDATE quarterly_priorities
SET 
  quarter = 'Q3',
  due_date = '2025-09-30'  -- End of Q3
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND quarter = 'Q1'
  AND year = 2025;

-- Also update the milestone dates to be more current
UPDATE priority_milestones
SET due_date = CASE 
  WHEN due_date = '2025-01-31' THEN '2025-07-31'
  WHEN due_date = '2025-02-15' THEN '2025-08-15'
  WHEN due_date = '2025-02-28' THEN '2025-08-31'
  WHEN due_date = '2025-03-15' THEN '2025-09-15'
  WHEN due_date = '2025-03-31' THEN '2025-09-30'
  ELSE due_date
END
WHERE priority_id IN (
  SELECT id FROM quarterly_priorities 
  WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
    AND quarter = 'Q3'
    AND year = 2025
);

-- Verify the updates
SELECT 
  'Rocks Updated to Current Quarter:' as status,
  quarter,
  year,
  COUNT(*) as rock_count
FROM quarterly_priorities
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND quarter = 'Q3'
  AND year = 2025
GROUP BY quarter, year;

-- Show all Q3 2025 rocks with their teams
SELECT 
  qp.title,
  qp.status,
  qp.quarter || ' ' || qp.year as period,
  t.name as team_name,
  t.is_leadership_team,
  u.first_name || ' ' || u.last_name as owner_name
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
ORDER BY t.is_leadership_team DESC, qp.created_at;