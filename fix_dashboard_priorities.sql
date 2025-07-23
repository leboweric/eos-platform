-- Fix Dashboard priorities

-- 1. Mark some Q3 2025 priorities as company priorities
UPDATE quarterly_priorities
SET is_company_priority = true
WHERE id IN (
    SELECT id 
    FROM quarterly_priorities
    WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
      AND quarter = 'Q3'
      AND year = 2025
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 5  -- Mark first 5 as company priorities
);

-- 2. Assign owners to priorities (distribute among team members)
WITH team_members AS (
    SELECT 
        u.id as user_id,
        ROW_NUMBER() OVER (ORDER BY u.first_name) as member_num
    FROM users u
    JOIN team_members tm ON u.id = tm.user_id
    WHERE tm.team_id = '47d53797-be5f-49c2-883a-326a401a17c1'
),
priorities_to_assign AS (
    SELECT 
        qp.id as priority_id,
        ROW_NUMBER() OVER (ORDER BY qp.title) as priority_num
    FROM quarterly_priorities qp
    WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
      AND qp.quarter = 'Q3'
      AND qp.year = 2025
      AND qp.deleted_at IS NULL
      AND qp.owner_id IS NULL  -- Only update priorities without owners
)
UPDATE quarterly_priorities
SET owner_id = (
    SELECT tm.user_id 
    FROM team_members tm
    WHERE tm.member_num = ((pa.priority_num - 1) % (SELECT COUNT(*) FROM team_members) + 1)
)
FROM priorities_to_assign pa
WHERE quarterly_priorities.id = pa.priority_id;

-- 3. Update priorities to current quarter (Q1 2025) if that's what the app expects
-- Check if this is needed based on investigation results
/*
UPDATE quarterly_priorities
SET quarter = 'Q1'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND quarter = 'Q3'
  AND year = 2025
  AND deleted_at IS NULL;
*/

-- 4. Verify the fix
SELECT 
    'Company Priorities' as priority_type,
    COUNT(*) as count,
    STRING_AGG(qp.title, ', ' ORDER BY qp.title) as titles
FROM quarterly_priorities qp
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.is_company_priority = true
  AND qp.deleted_at IS NULL
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
UNION ALL
SELECT 
    'Individual Priorities by ' || u.first_name || ' ' || u.last_name as priority_type,
    COUNT(*) as count,
    STRING_AGG(qp.title, ', ' ORDER BY qp.title) as titles
FROM quarterly_priorities qp
JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
  AND qp.quarter = 'Q3'
  AND qp.year = 2025
GROUP BY u.id, u.first_name, u.last_name;