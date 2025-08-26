-- Find Strategic Consulting and check their Rocks

-- 1. Find the Strategic Consulting organization
SELECT 
    id,
    name,
    created_at
FROM organizations 
WHERE LOWER(name) LIKE '%strategic%'
   OR LOWER(name) LIKE '%consulting%'
   OR LOWER(name) LIKE '%coaching%'
ORDER BY name;

-- 2. Check if quarterly_priorities table exists and what columns it has
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities'
ORDER BY ordinal_position
LIMIT 20;

-- 3. Count rocks for all organizations with strategic/consulting in name
SELECT 
    o.id as org_id,
    o.name as org_name,
    COUNT(qp.id) as total_rocks
FROM organizations o
LEFT JOIN quarterly_priorities qp ON qp.organization_id = o.id
WHERE LOWER(o.name) LIKE '%strategic%'
   OR LOWER(o.name) LIKE '%consulting%' 
   OR LOWER(o.name) LIKE '%coaching%'
GROUP BY o.id, o.name
ORDER BY o.name;

-- 4. If you found the org ID above, replace it here to see all their rocks
-- COPY THE ID FROM QUERY #1 AND PASTE IT IN THE NEXT QUERY
/*
SELECT 
    id,
    title,
    description,
    quarter,
    year,
    status,
    progress,
    created_at,
    updated_at
FROM quarterly_priorities
WHERE organization_id = 'PASTE_ORG_ID_HERE'
ORDER BY year DESC, quarter DESC, created_at DESC;
*/

-- 5. Check ALL quarterly_priorities to see if any exist
SELECT 
    COUNT(*) as total_rocks_in_system,
    COUNT(DISTINCT organization_id) as total_orgs_with_rocks,
    MAX(created_at) as most_recent_rock_created
FROM quarterly_priorities;

-- 6. Show first few organizations that DO have rocks (for comparison)
SELECT 
    o.name,
    COUNT(qp.id) as rock_count
FROM organizations o
INNER JOIN quarterly_priorities qp ON qp.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(qp.id) > 0
ORDER BY COUNT(qp.id) DESC
LIMIT 10;