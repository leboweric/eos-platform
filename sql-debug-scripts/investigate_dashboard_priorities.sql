-- Investigate why Dashboard priorities aren't showing

-- 1. Check current priorities and their settings
SELECT 
    qp.id,
    qp.title,
    qp.quarter,
    qp.year,
    qp.is_company_priority,
    qp.owner_id,
    u.first_name || ' ' || u.last_name as owner_name,
    u.email as owner_email,
    qp.status,
    qp.team_id
FROM quarterly_priorities qp
LEFT JOIN users u ON qp.owner_id = u.id
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
  AND qp.quarter = 'Q1' -- Current quarter
  AND qp.year = 2025
ORDER BY qp.is_company_priority DESC, qp.title;

-- 2. Check if we're looking at the right quarter
SELECT 
    DISTINCT quarter, 
    year, 
    COUNT(*) as priority_count,
    SUM(CASE WHEN is_company_priority = true THEN 1 ELSE 0 END) as company_priority_count,
    SUM(CASE WHEN owner_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_priority_count
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
GROUP BY quarter, year
ORDER BY year DESC, quarter DESC;

-- 3. Check what the current quarter should be
SELECT 
    'Current Date' as info,
    CURRENT_DATE as today,
    'Q' || EXTRACT(QUARTER FROM CURRENT_DATE)::text as current_quarter,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as current_year;

-- 4. Fix: Mark some priorities as company priorities for Q1 2025
-- First, let's see Q1 2025 priorities
SELECT 
    qp.id,
    qp.title,
    qp.is_company_priority,
    qp.owner_id
FROM quarterly_priorities qp
WHERE qp.organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND qp.deleted_at IS NULL
  AND qp.quarter = 'Q1'
  AND qp.year = 2025;

-- 5. If you have Q3 2025 priorities but need Q1 2025, we can copy them
/*
INSERT INTO quarterly_priorities (
    id, organization_id, team_id, title, description, status, 
    quarter, year, is_company_priority, owner_id, created_by, created_at
)
SELECT 
    gen_random_uuid(),
    organization_id,
    team_id,
    title,
    description,
    'on-track',
    'Q1',  -- Change to Q1
    2025,
    true,  -- Make them company priorities
    owner_id,
    created_by,
    NOW()
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND quarter = 'Q3'
  AND year = 2025
  AND deleted_at IS NULL
LIMIT 5;  -- Copy first 5 as company priorities
*/