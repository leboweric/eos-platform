-- Let's see what organizations actually exist in the database

-- 1. List ALL organizations (no filter)
SELECT 
    id,
    name,
    created_at
FROM organizations
ORDER BY created_at DESC;

-- 2. Count total organizations
SELECT 
    COUNT(*) as total_organizations
FROM organizations;

-- 3. Search for any org with common business terms
SELECT 
    id,
    name,
    created_at
FROM organizations
WHERE LOWER(name) LIKE '%consult%'
   OR LOWER(name) LIKE '%strategic%'
   OR LOWER(name) LIKE '%coach%'
   OR LOWER(name) LIKE '%advisory%'
   OR LOWER(name) LIKE '%partners%'
   OR LOWER(name) LIKE '%group%'
   OR LOWER(name) LIKE '%llc%'
   OR LOWER(name) LIKE '%inc%'
ORDER BY name;

-- 4. Show organizations created in last 90 days
SELECT 
    id,
    name,
    created_at
FROM organizations
WHERE created_at > CURRENT_DATE - INTERVAL '90 days'
ORDER BY created_at DESC;

-- 5. Check if you might be looking at wrong database
-- This shows current database name and connection info
SELECT 
    current_database() as database_name,
    current_user as user_name,
    version() as postgres_version;

-- 6. Check if there's a display name vs actual name issue
-- Try searching with partial strings
SELECT 
    id,
    name,
    SUBSTRING(name FROM 1 FOR 50) as name_preview,
    LENGTH(name) as name_length
FROM organizations
WHERE name IS NOT NULL
ORDER BY name;

-- 7. Check for case sensitivity or special characters
SELECT 
    id,
    name,
    LOWER(name) as lowercase_name,
    UPPER(name) as uppercase_name
FROM organizations
WHERE name ILIKE '%stra%' -- Case insensitive partial match
   OR name ILIKE '%con%'
   OR name ILIKE '%coa%';

-- 8. If this is multi-tenant, check if there's a tenant column
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'organizations'
ORDER BY ordinal_position;