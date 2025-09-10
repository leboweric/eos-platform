-- Convert revenue_target columns in revenue streams tables to TEXT
-- This allows users to enter revenue streams in any format they prefer

-- Convert revenue_target column to TEXT in three_year_revenue_streams
ALTER TABLE three_year_revenue_streams 
ALTER COLUMN revenue_target TYPE TEXT;

-- Convert revenue_target column to TEXT in one_year_revenue_streams
ALTER TABLE one_year_revenue_streams
ALTER COLUMN revenue_target TYPE TEXT;

-- Note: Existing numeric values will be automatically converted to text