-- Check if priorities have is_company_priority flag set

-- 1. Show all priorities with their flags
SELECT 
    qp.id,
    qp.title,
    qp.is_company_priority,
    qp.team_id,
    t.name as team_name,
    u.email as owner_email,
    qp.deleted_at
FROM quarterly_priorities qp
LEFT JOIN teams t ON qp.team_id = t.id
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
ORDER BY qp.is_company_priority DESC, qp.title;

-- 2. Count company vs individual priorities
SELECT 
    CASE 
        WHEN is_company_priority = true THEN 'Company Priority'
        ELSE 'Individual Priority'
    END as priority_type,
    COUNT(*) as count
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
GROUP BY is_company_priority;

-- 3. Update priorities to mark them as company priorities if needed
-- UNCOMMENT AND RUN THIS IF NEEDED:
/*
UPDATE quarterly_priorities
SET is_company_priority = true
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
  AND title IN ('YOUR_COMPANY_PRIORITY_TITLES_HERE');
*/