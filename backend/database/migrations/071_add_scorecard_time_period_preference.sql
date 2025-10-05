-- Migration: Add scorecard time period preference to organizations
-- Date: 2024-10-05
-- Purpose: Allow organizations to configure how scorecard time periods are displayed
--          Supports Adaptive Framework Technology patent for methodology flexibility

-- Add scorecard time period preference column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS scorecard_time_period_preference VARCHAR(50) 
DEFAULT '13_week_rolling';

-- Add comment explaining the column and valid values
COMMENT ON COLUMN organizations.scorecard_time_period_preference IS 
'Controls time period display in scorecard meetings and views. Valid values: 13_week_rolling (EOS standard), current_quarter (financial quarters), last_4_weeks (short-term focus). Supports Adaptive Framework Technology for methodology-specific preferences.';

-- Add check constraint to ensure only valid values are allowed
ALTER TABLE organizations 
ADD CONSTRAINT chk_scorecard_time_period_preference 
CHECK (scorecard_time_period_preference IN ('13_week_rolling', 'current_quarter', 'last_4_weeks'));

-- Update existing organizations to have default value (safety check)
UPDATE organizations 
SET scorecard_time_period_preference = '13_week_rolling' 
WHERE scorecard_time_period_preference IS NULL;

-- Verify the migration worked
SELECT 
    id,
    name,
    scorecard_time_period_preference
FROM organizations 
LIMIT 5;

-- Migration complete
-- Next steps: Update organizationController.js to handle this field