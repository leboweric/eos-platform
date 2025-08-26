-- Let's see what's actually in this database

-- 1. Check row counts for tables that DO exist
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
FROM universal_objectives;

-- 2. Check which database you're connected to
SELECT 
    current_database() as database_name,
    pg_database_size(current_database())/1024/1024 as size_mb,
    current_user as connected_as,
    inet_server_addr() as server_address,
    current_timestamp as checked_at;

-- 3. Show actual organizations (if any exist)
SELECT * FROM organizations;

-- 4. Show actual users (if any exist)  
SELECT id, email, organization_id FROM users LIMIT 10;

-- 5. List ALL tables with their creation times (approximately)
SELECT 
    schemaname,
    tablename,
    n_live_tup as approximate_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 6. Check if this might be the new universal_objectives data
SELECT 
    COUNT(*) as total_objectives,
    COUNT(DISTINCT organization_id) as total_orgs
FROM universal_objectives;

-- 7. If there's data in universal_objectives, show it
SELECT 
    uo.*,
    o.name as org_name
FROM universal_objectives uo
LEFT JOIN organizations o ON o.id = uo.organization_id
LIMIT 10;

-- 8. Check connection string info
SELECT 
    datname as database,
    usename as owner,
    encoding,
    datcollate as collation
FROM pg_database
WHERE datname = current_database();