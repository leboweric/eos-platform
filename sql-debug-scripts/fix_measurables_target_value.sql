-- Quick fix for measurables target_value error
-- Run this in pgAdmin to allow text values like "$550M" in target_value fields

-- Change three_year_measurables target_value to text
ALTER TABLE three_year_measurables 
ALTER COLUMN target_value TYPE TEXT;

-- Change one_year_measurables target_value to text  
ALTER TABLE one_year_measurables
ALTER COLUMN target_value TYPE TEXT;

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('three_year_measurables', 'one_year_measurables')
AND column_name = 'target_value';