-- Check the structure of one_year_plans table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'one_year_plans'
ORDER BY ordinal_position;