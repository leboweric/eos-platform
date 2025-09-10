-- Convert profit and revenue columns to TEXT to allow freeform entry
-- This allows users to enter values in any format they prefer ($25M, 25%, $25,000,000, etc.)

-- Convert profit_target column to TEXT in three_year_pictures
ALTER TABLE three_year_pictures 
ALTER COLUMN profit_target TYPE TEXT;

-- Convert revenue_target column to TEXT in three_year_pictures  
ALTER TABLE three_year_pictures
ALTER COLUMN revenue_target TYPE TEXT;

-- Convert profit_percentage column to TEXT in one_year_plans
ALTER TABLE one_year_plans
ALTER COLUMN profit_percentage TYPE TEXT;

-- Convert revenue_target column to TEXT in one_year_plans
ALTER TABLE one_year_plans
ALTER COLUMN revenue_target TYPE TEXT;

-- Note: Existing numeric values will be automatically converted to text
-- For example, 25.5 becomes '25.5' which can be displayed as needed