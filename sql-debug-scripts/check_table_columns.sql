-- Check which columns exist in users and organizations tables

-- Check users table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check organizations table columns  
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'organizations'
ORDER BY ordinal_position;