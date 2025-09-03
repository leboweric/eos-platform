-- Diagnostic query to find team ID issues
-- Run this in pgAdmin on the railway database to understand the team ID problem

-- 1. Check all team IDs and their character lengths
SELECT 
    id,
    name,
    is_leadership_team,
    organization_id,
    LENGTH(id::text) as id_length,
    CASE 
        WHEN LENGTH(id::text) = 36 THEN 'Valid UUID'
        WHEN LENGTH(id::text) < 36 THEN 'Too Short'
        WHEN LENGTH(id::text) > 36 THEN 'Too Long'
        ELSE 'Unknown'
    END as id_status
FROM teams 
ORDER BY id_length, name;

-- 2. Find any teams with non-standard UUID formats
SELECT 
    id,
    name,
    organization_id,
    'Invalid UUID format' as issue
FROM teams 
WHERE id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Look for the specific problematic team
SELECT 
    *,
    LENGTH(id::text) as id_length
FROM teams 
WHERE id::text LIKE '%d23dff10959f%'
   OR id::text = 'd23dff10959f'
   OR id::text = '559822f8-c442-48dd-91dc-d23dff10959f';

-- 4. Check if there are any team references with the short ID
SELECT 
    'issues' as table_name,
    COUNT(*) as count,
    team_id
FROM issues 
WHERE team_id::text LIKE '%d23dff10959f%'
GROUP BY team_id

UNION ALL

SELECT 
    'todos' as table_name,
    COUNT(*) as count,
    team_id
FROM todos 
WHERE team_id::text LIKE '%d23dff10959f%'
GROUP BY team_id

UNION ALL

SELECT 
    'quarterly_priorities' as table_name,
    COUNT(*) as count,
    team_id
FROM quarterly_priorities 
WHERE team_id::text LIKE '%d23dff10959f%'
GROUP BY team_id

UNION ALL

SELECT 
    'scorecard_metrics' as table_name,
    COUNT(*) as count,
    team_id
FROM scorecard_metrics 
WHERE team_id::text LIKE '%d23dff10959f%'
GROUP BY team_id;