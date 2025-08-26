-- Let's find what tables actually exist and have data

-- 1. List ALL tables in the current database
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Find any table with 'org' in the name
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%org%' OR table_name LIKE '%company%' OR table_name LIKE '%tenant%' OR table_name LIKE '%client%')
ORDER BY table_name;

-- 3. Find any table with 'quarter' or 'priority' or 'rock' in the name
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%quarter%' OR table_name LIKE '%priorit%' OR table_name LIKE '%rock%' OR table_name LIKE '%goal%' OR table_name LIKE '%objective%')
ORDER BY table_name;

-- 4. Check row counts for likely tables
SELECT 
    'organizations' as table_name, COUNT(*) as row_count FROM organizations
UNION ALL
SELECT 
    'quarterly_priorities' as table_name, COUNT(*) as row_count FROM quarterly_priorities
UNION ALL
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 
    'teams' as table_name, COUNT(*) as row_count FROM teams;

-- 5. Check if maybe it's in a different schema
SELECT 
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_name IN ('organizations', 'quarterly_priorities', 'companies', 'clients', 'tenants')
ORDER BY table_schema, table_name;

-- 6. Find tables with data (tables that have at least 1 row)
-- This query shows tables ordered by their approximate row count
SELECT 
    schemaname,
    tablename,
    n_live_tup as approximate_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0
ORDER BY n_live_tup DESC;

-- 7. Check current database and schema
SELECT 
    current_database() as current_db,
    current_schema() as current_schema,
    current_user as connected_as;

-- 8. Look for any table that might contain "Strategic Consulting"
-- This searches all text/varchar columns in all tables (might be slow)
DO $$
DECLARE
    query text;
    result record;
BEGIN
    FOR result IN 
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('character varying', 'text')
          AND table_name NOT IN ('pg_stat_statements')
    LOOP
        query := format('SELECT ''%I.%I'' as location, %I as value FROM %I WHERE %I::text ILIKE ''%%strategic%%'' LIMIT 1',
                       result.table_name, result.column_name, result.column_name, result.table_name, result.column_name);
        BEGIN
            EXECUTE query;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors
        END;
    END LOOP;
END $$;