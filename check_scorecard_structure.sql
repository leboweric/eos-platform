-- First, check the structure of scorecard_scores table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'scorecard_scores'
ORDER BY ordinal_position;