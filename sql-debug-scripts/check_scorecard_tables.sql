-- List all tables related to scorecard
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%scorecard%'
ORDER BY table_name;

-- Check the structure of scorecard_metrics table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scorecard_metrics'
ORDER BY ordinal_position;

-- Check if there's a different table for scorecard data/values
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%metric%' OR table_name LIKE '%score%' OR table_name LIKE '%entry%' OR table_name LIKE '%value%')
ORDER BY table_name;