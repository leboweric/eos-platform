-- Migration to update Business Blueprint schema
-- Changes:
-- 1. Add hedgehog_type to core_focus (Purpose/Cause/Passion)
-- 2. Add separate columns for 3 differentiators to marketing_strategies
-- 3. Change proven_process and guarantee to boolean in marketing_strategies

BEGIN;

-- Update core_focus table to add hedgehog_type
ALTER TABLE core_focus 
ADD COLUMN hedgehog_type VARCHAR(20) CHECK (hedgehog_type IN ('purpose', 'cause', 'passion'));

-- Update marketing_strategies table
ALTER TABLE marketing_strategies 
ADD COLUMN differentiator_1 TEXT,
ADD COLUMN differentiator_2 TEXT,
ADD COLUMN differentiator_3 TEXT,
ADD COLUMN proven_process_exists BOOLEAN DEFAULT false,
ADD COLUMN guarantee_exists BOOLEAN DEFAULT false;

-- Migrate existing data (if any)
UPDATE marketing_strategies 
SET proven_process_exists = CASE WHEN proven_process IS NOT NULL AND proven_process != '' THEN true ELSE false END,
    guarantee_exists = CASE WHEN guarantee IS NOT NULL AND guarantee != '' THEN true ELSE false END;

-- Optional: Keep old columns for backward compatibility during transition
-- Later migration can drop these columns after ensuring all code is updated
-- ALTER TABLE marketing_strategies DROP COLUMN three_uniques;
-- ALTER TABLE marketing_strategies DROP COLUMN proven_process;
-- ALTER TABLE marketing_strategies DROP COLUMN guarantee;

COMMIT;