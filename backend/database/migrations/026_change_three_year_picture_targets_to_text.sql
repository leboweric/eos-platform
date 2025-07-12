-- Change revenue_target and profit_target columns from DECIMAL to TEXT
-- This allows users to enter values like "$1M" or "20%" 
ALTER TABLE three_year_pictures 
ALTER COLUMN revenue_target TYPE TEXT,
ALTER COLUMN profit_target TYPE TEXT;

-- Add comments
COMMENT ON COLUMN three_year_pictures.revenue_target IS 'Revenue target as text (e.g., "$10M", "$1B")';
COMMENT ON COLUMN three_year_pictures.profit_target IS 'Profit target as text (e.g., "$2M", "20%")';