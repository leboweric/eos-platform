-- Change target_value columns from numeric to text to allow formatted values like "$550M"

-- Change three_year_measurables target_value to text
ALTER TABLE three_year_measurables 
ALTER COLUMN target_value TYPE TEXT;

-- Change one_year_measurables target_value to text  
ALTER TABLE one_year_measurables
ALTER COLUMN target_value TYPE TEXT;

-- Note: This migration allows storing formatted text values in the target_value columns
-- Examples: "$550M", "50 customers", "95% satisfaction", etc.