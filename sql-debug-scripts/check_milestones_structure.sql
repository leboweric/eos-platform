-- Check the structure of priority_milestones table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'priority_milestones'
ORDER BY ordinal_position;