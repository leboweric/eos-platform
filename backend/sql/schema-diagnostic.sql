-- CRITICAL DIAGNOSTIC QUERIES
-- Run these one by one in pgAdmin

-- 1. What schema is YOUR prospects table in?
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'prospects';

-- 2. Count prospects in EACH schema
SELECT 
    'public schema' as location,
    COUNT(*) as count 
FROM public.prospects;

-- 3. Count without schema prefix (uses search_path)
SELECT 
    'default search path' as location,
    COUNT(*) as count 
FROM prospects;

-- 4. What's your current search_path?
SHOW search_path;

-- 5. Get current schema
SELECT current_schema();

-- 6. Count in all possible locations
WITH schema_counts AS (
    SELECT 'public' as schema_name, COUNT(*) as count FROM public.prospects
)
SELECT * FROM schema_counts;

-- 7. Show first 3 prospects from the table you CAN see
-- (modify schema name if needed based on result from query #1)
SELECT 
    id,
    company_name,
    created_at
FROM prospects  -- or public.prospects
LIMIT 3;

-- 8. Check if there are multiple prospects tables
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    pg_size_pretty(pg_relation_size(c.oid)) as size,
    c.reltuples::bigint as row_estimate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'prospects'
AND c.relkind = 'r'
ORDER BY n.nspname;