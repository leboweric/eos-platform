-- Check if tables have data

-- 1. Check row counts for main tables
SELECT 
    'organizations' as table_name, COUNT(*) as row_count 
FROM organizations
UNION ALL
SELECT 
    'users' as table_name, COUNT(*) as row_count 
FROM users
UNION ALL
SELECT 
    'teams' as table_name, COUNT(*) as row_count 
FROM teams
UNION ALL
SELECT 
    'departments' as table_name, COUNT(*) as row_count 
FROM departments
UNION ALL
SELECT 
    'universal_objectives' as table_name, COUNT(*) as row_count 
FROM universal_objectives
UNION ALL
SELECT 
    'quarterly_priorities' as table_name, COUNT(*) as row_count 
FROM quarterly_priorities
UNION ALL
SELECT 
    'framework_configurations' as table_name, COUNT(*) as row_count 
FROM framework_configurations;

-- 2. Check if quarterly_priorities table exists (it's not in your list!)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quarterly_priorities'
) as quarterly_priorities_exists;

-- 3. Show ANY data from organizations table
SELECT * FROM organizations LIMIT 10;

-- 4. Show ANY data from users table
SELECT * FROM users LIMIT 10;

-- 5. Check if we're in the right database
SELECT 
    current_database() as database_name,
    current_schema() as schema_name,
    current_user as user_name;

-- 6. Look for tables that might contain priorities/rocks
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%priorit%' 
    OR table_name LIKE '%rock%' 
    OR table_name LIKE '%quarter%'
    OR table_name LIKE '%goal%'
    OR table_name LIKE '%milestone%'
  )
ORDER BY table_name;

-- 7. Check if maybe the data is in universal_objectives now
SELECT 
    id,
    title,
    framework_type,
    organization_id,
    created_at
FROM universal_objectives
LIMIT 10;

-- 8. Search for any column that might have "Strategic Consulting"
SELECT 
    table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%name%'
  AND data_type IN ('character varying', 'text')
ORDER BY table_name, column_name;