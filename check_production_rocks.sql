-- Check Strategic Consulting's Rocks in your EXISTING production database
-- This checks the ORIGINAL tables, not our new ones

-- 1. First, verify you have data in the original tables
SELECT 
    COUNT(*) as org_count 
FROM organizations;

-- 2. Find Strategic Consulting (try various spellings)
SELECT 
    id,
    name
FROM organizations
WHERE name ILIKE '%strategic%'
   OR name ILIKE '%consult%'
   OR name ILIKE '%coach%';

-- 3. Look for ALL organizations to find the right name
SELECT 
    id,
    name
FROM organizations
ORDER BY name;

-- 4. Check if quarterly_priorities exists and has data
SELECT 
    COUNT(*) as total_rocks,
    COUNT(DISTINCT organization_id) as orgs_with_rocks,
    MAX(created_at) as most_recent_rock
FROM quarterly_priorities;

-- 5. Find rocks for any org with "strategic" in any field
SELECT 
    o.name as org_name,
    qp.title as rock_title,
    qp.quarter,
    qp.year,
    qp.status
FROM quarterly_priorities qp
JOIN organizations o ON o.id = qp.organization_id
WHERE o.name ILIKE '%strategic%'
   OR qp.title ILIKE '%strategic%'
ORDER BY qp.year DESC, qp.quarter DESC;

-- 6. Check if maybe they're filtered by department or team
-- See if there are rocks with NULL department/team
SELECT 
    COUNT(*) as total_rocks,
    COUNT(CASE WHEN department_id IS NULL THEN 1 END) as no_department,
    COUNT(CASE WHEN team_id IS NULL THEN 1 END) as no_team,
    COUNT(CASE WHEN department_id IS NULL AND team_id IS NULL THEN 1 END) as no_dept_or_team
FROM quarterly_priorities;

-- 7. Show me what's actually in organizations table (first 20)
SELECT name FROM organizations LIMIT 20;