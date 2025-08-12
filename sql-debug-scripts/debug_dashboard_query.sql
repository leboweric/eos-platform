-- Debug: What might the Dashboard be filtering on?

-- 1. Check if there's a visibility issue with team/department
SELECT 
    'Company Priorities' as type,
    COUNT(*) as count,
    t.id as team_id,
    t.name as team_name,
    t.department_id,
    d.name as department_name
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
LEFT JOIN departments d ON t.department_id = d.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.is_company_priority = true
  AND qp.deleted_at IS NULL
GROUP BY t.id, t.name, t.department_id, d.name;

-- 2. Check if priorities are visible when queried with the Leadership Team context
SELECT 
    p.id,
    p.title,
    p.is_company_priority,
    p.status,
    p.team_id,
    u.id as owner_id,
    u.first_name || ' ' || u.last_name as owner_name
FROM quarterly_priorities p
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND p.team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Leadership Team ID
  AND p.deleted_at IS NULL;

-- 3. Check user priorities for each team member
SELECT 
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    u.email,
    COUNT(qp.id) as owned_priorities,
    COUNT(qp.id) FILTER (WHERE qp.is_company_priority = true) as owned_company_priorities
FROM users u
JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id 
    AND qp.deleted_at IS NULL
    AND qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
WHERE tm.team_id = '47d53797-be5f-49c2-883a-326a401a17c1'  -- Leadership Team
GROUP BY u.id, u.first_name, u.last_name, u.email
ORDER BY user_name;

-- 4. Simple test: Can we see the priorities without any complex joins?
SELECT COUNT(*) as company_priority_count
FROM quarterly_priorities 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND is_company_priority = true
  AND deleted_at IS NULL;