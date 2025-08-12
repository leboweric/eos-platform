-- Simple check: What company priorities exist for Skykit?

-- 1. Show all company priorities
SELECT 
    qp.id,
    qp.title,
    qp.is_company_priority,
    qp.status,
    qp.owner_id,
    u.first_name || ' ' || u.last_name as owner_name,
    qp.team_id,
    t.name as team_name
FROM quarterly_priorities qp
LEFT JOIN users u ON qp.owner_id = u.id
LEFT JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.is_company_priority = true
  AND qp.deleted_at IS NULL;

-- 2. Show priorities by user
SELECT 
    u.first_name || ' ' || u.last_name as user_name,
    COUNT(qp.id) as priority_count,
    STRING_AGG(qp.title, ', ' ORDER BY qp.title) as priorities
FROM users u
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id
    AND qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
    AND qp.deleted_at IS NULL
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY u.id, u.first_name, u.last_name
ORDER BY user_name;

-- 3. Quick summary
SELECT 
    COUNT(*) FILTER (WHERE is_company_priority = true) as company_priorities,
    COUNT(*) as total_priorities,
    COUNT(DISTINCT owner_id) as users_with_priorities
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL;