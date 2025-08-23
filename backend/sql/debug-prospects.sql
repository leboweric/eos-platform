-- Debug SQL Queries for Prospects
-- Run these in pgAdmin to diagnose the issue

-- 1. Check current database and connection
SELECT 
    current_database() as database_name,
    current_user as user_name,
    current_schema() as schema_name,
    version() as postgres_version;

-- 2. Show search path
SHOW search_path;

-- 3. List ALL schemas
SELECT schema_name 
FROM information_schema.schemata
ORDER BY schema_name;

-- 4. Find ALL prospects tables in ANY schema
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'prospects'
ORDER BY schemaname;

-- 5. Check if prospects exists in public schema specifically
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'prospects'
) as prospects_in_public;

-- 6. List ALL tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 7. Try counting with explicit schema
SELECT 'public.prospects' as table_name, COUNT(*) as count 
FROM public.prospects;

-- 8. Try counting without schema (uses search_path)
SELECT 'prospects' as table_name, COUNT(*) as count 
FROM prospects;

-- 9. Check for prospects in other schemas
DO $$
DECLARE
    schema_name text;
    count_result integer;
BEGIN
    FOR schema_name IN 
        SELECT s.nspname 
        FROM pg_namespace s
        WHERE s.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM %I.prospects', schema_name) INTO count_result;
            RAISE NOTICE 'Schema % has % prospects', schema_name, count_result;
        EXCEPTION
            WHEN undefined_table THEN
                -- Table doesn't exist in this schema, continue
                NULL;
        END;
    END LOOP;
END $$;

-- 10. Check table structure if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'prospects'
AND table_schema = 'public'
ORDER BY ordinal_position
LIMIT 10;

-- 11. Force search path and try again
SET search_path TO public;
SELECT COUNT(*) as count_after_set_path FROM prospects;

-- 12. Check for case sensitivity issues
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE LOWER(tablename) = 'prospects';

-- 13. Get sample data with error handling
DO $$
BEGIN
    -- Try public schema
    BEGIN
        RAISE NOTICE 'Trying public.prospects...';
        PERFORM company_name FROM public.prospects LIMIT 1;
        RAISE NOTICE 'SUCCESS: public.prospects exists and has data';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'FAIL: public.prospects does not exist';
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: % %', SQLERRM, SQLSTATE;
    END;
    
    -- Try without schema
    BEGIN
        RAISE NOTICE 'Trying prospects (no schema)...';
        PERFORM company_name FROM prospects LIMIT 1;
        RAISE NOTICE 'SUCCESS: prospects exists and is accessible';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'FAIL: prospects not found in search path';
        WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: % %', SQLERRM, SQLSTATE;
    END;
END $$;

-- 14. Check if you're in a transaction that hasn't seen the data
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = current_database()
AND pid = pg_backend_pid();

-- 15. Final comprehensive check
WITH db_info AS (
    SELECT 
        current_database() as db,
        current_schema() as schema,
        current_user as usr
),
table_check AS (
    SELECT 
        COUNT(*) as table_count
    FROM pg_tables 
    WHERE tablename = 'prospects'
),
public_check AS (
    SELECT 
        EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'prospects'
        ) as exists_in_public
)
SELECT 
    d.db,
    d.schema,
    d.usr,
    t.table_count as prospects_tables_found,
    p.exists_in_public
FROM db_info d, table_check t, public_check p;