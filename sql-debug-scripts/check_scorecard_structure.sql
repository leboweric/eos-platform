-- Check scorecard_metrics table structure to ensure all columns exist
-- Run this BEFORE running the add_boyum_financial_metrics.sql script

-- 1. Check if scorecard_metrics table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'scorecard_metrics'
) AS table_exists;

-- 2. List all columns in scorecard_metrics table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scorecard_metrics'
ORDER BY ordinal_position;

-- 3. Check if all required columns exist
SELECT 
    CASE WHEN COUNT(*) = 11 THEN 'All required columns exist' 
         ELSE 'Missing some required columns' 
    END as column_check,
    COUNT(*) as found_columns
FROM information_schema.columns
WHERE table_name = 'scorecard_metrics'
AND column_name IN (
    'id', 
    'organization_id', 
    'team_id', 
    'name', 
    'goal', 
    'owner', 
    'type', 
    'value_type', 
    'comparison_operator', 
    'description', 
    'display_order'
);

-- 4. Check for any missing columns specifically
WITH required_columns AS (
    SELECT unnest(ARRAY[
        'id', 
        'organization_id', 
        'team_id', 
        'name', 
        'goal', 
        'owner', 
        'type', 
        'value_type', 
        'comparison_operator', 
        'description', 
        'display_order'
    ]) AS column_name
),
existing_columns AS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'scorecard_metrics'
)
SELECT 
    rc.column_name AS missing_column
FROM required_columns rc
LEFT JOIN existing_columns ec ON rc.column_name = ec.column_name
WHERE ec.column_name IS NULL;

-- 5. Check if Boyum organization exists
SELECT 
    id, 
    name, 
    slug 
FROM organizations 
WHERE name = 'Boyum Barenscheer';

-- 6. Check if Patty user exists
SELECT 
    id, 
    email, 
    first_name, 
    last_name 
FROM users 
WHERE email = 'patty@boyumcpa.com';

-- 7. Check existing metrics for Boyum to avoid duplicates
SELECT 
    name, 
    type, 
    goal, 
    owner 
FROM scorecard_metrics 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Boyum Barenscheer')
  AND team_id = '00000000-0000-0000-0000-000000000000'
ORDER BY display_order;