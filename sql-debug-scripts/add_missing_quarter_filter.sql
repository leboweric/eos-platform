-- Check what quarter/year combinations we have in the database
SELECT 
    quarter,
    year,
    COUNT(*) as priority_count,
    COUNT(DISTINCT team_id) as team_count,
    COUNT(DISTINCT owner_id) as owner_count
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
GROUP BY quarter, year
ORDER BY year DESC, quarter DESC;

-- The backend getCurrentPriorities is not filtering by quarter
-- For now, let's ensure our Q3 2025 priorities are properly set up
SELECT 
    COUNT(*) FILTER (WHERE is_company_priority = true) as company_priorities,
    COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as assigned_priorities,
    COUNT(*) as total_priorities
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND quarter = 'Q3'
  AND year = 2025
  AND deleted_at IS NULL;

-- Make sure we have enough company priorities (at least 5)
UPDATE quarterly_priorities
SET is_company_priority = true
WHERE id IN (
    SELECT id 
    FROM quarterly_priorities
    WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
      AND quarter = 'Q3'
      AND year = 2025
      AND deleted_at IS NULL
      AND is_company_priority = false
    ORDER BY created_at
    LIMIT 3  -- This will give us 7 total company priorities (4 existing + 3 new)
);

-- Verify all users have at least one priority assigned
WITH user_priority_counts AS (
    SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        COUNT(qp.id) as priority_count
    FROM users u
    LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id 
        AND qp.quarter = 'Q3' 
        AND qp.year = 2025 
        AND qp.deleted_at IS NULL
    WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
    GROUP BY u.id, u.first_name, u.last_name
)
SELECT * FROM user_priority_counts ORDER BY priority_count, user_name;