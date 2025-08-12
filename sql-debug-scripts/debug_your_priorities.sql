-- Debug "Your Priorities" - simple check for each user

-- 1. Show all priorities with their owners
SELECT 
    u.email as owner_email,
    u.first_name || ' ' || u.last_name as owner_name,
    COUNT(qp.id) as priority_count,
    STRING_AGG(qp.title, '; ' ORDER BY qp.title) as priorities
FROM users u
LEFT JOIN quarterly_priorities qp ON u.id = qp.owner_id 
    AND qp.deleted_at IS NULL
WHERE u.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
GROUP BY u.id, u.email, u.first_name, u.last_name
ORDER BY owner_name;

-- 2. Show raw data - what priorities exist and who owns them
SELECT 
    qp.id,
    qp.title,
    qp.owner_id,
    u.email as owner_email,
    qp.status,
    qp.deleted_at
FROM quarterly_priorities qp
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
ORDER BY u.email, qp.title;

-- 3. Specific check - when you log in as a specific user, what should they see?
-- Replace 'admin@skykit.com' with the email of the user you're testing with
SELECT 
    qp.id,
    qp.title,
    qp.status,
    qp.is_company_priority
FROM quarterly_priorities qp
JOIN users u ON qp.owner_id = u.id
WHERE u.email = 'admin@skykit.com'  -- CHANGE THIS to your test user's email
  AND qp.deleted_at IS NULL;