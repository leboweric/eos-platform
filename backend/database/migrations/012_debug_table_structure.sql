-- Debug query to check the actual column order in quarterly_priorities table
SELECT 
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities'
ORDER BY ordinal_position;