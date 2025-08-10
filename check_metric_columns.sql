-- Check the actual columns in scorecard_metrics table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scorecard_metrics'
ORDER BY ordinal_position;

-- Check if there's an 'owner' column vs 'owner_id' column
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scorecard_metrics' AND column_name = 'owner')
        THEN 'Has owner column'
        ELSE 'No owner column'
    END as owner_check,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scorecard_metrics' AND column_name = 'owner_id')
        THEN 'Has owner_id column'
        ELSE 'No owner_id column'
    END as owner_id_check;