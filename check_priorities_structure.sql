-- Check the structure of quarterly_priorities table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'quarterly_priorities'
ORDER BY ordinal_position;