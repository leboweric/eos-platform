-- Migration: Add summary_type column to scorecard_metrics table
-- Date: 2025-11-13
-- Description: Allows each scorecard metric to have a custom summary calculation type

-- Step 1: Add the summary_type column with a default value
ALTER TABLE scorecard_metrics
ADD COLUMN summary_type VARCHAR(50) NOT NULL DEFAULT 'weekly_avg';

-- Step 2: Add a check constraint to ensure only valid values are allowed
ALTER TABLE scorecard_metrics
ADD CONSTRAINT scorecard_metrics_summary_type_check 
CHECK (summary_type IN ('weekly_avg', 'monthly_avg', 'quarterly_total', 'quarterly_avg', 'latest_value'));

-- Step 3: Add a comment to document the column
COMMENT ON COLUMN scorecard_metrics.summary_type IS 'Defines how the metric summary is calculated: weekly_avg (average of weekly scores), monthly_avg (average of monthly scores), quarterly_total (sum of all scores in quarter), quarterly_avg (average of all scores in quarter), latest_value (most recent non-null score)';

-- Step 4: Create an index for better query performance (optional but recommended)
CREATE INDEX idx_scorecard_metrics_summary_type ON scorecard_metrics(summary_type);

-- Verification query: Check that the column was added successfully
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'scorecard_metrics' AND column_name = 'summary_type';

-- Verification query: Check existing metrics now have the default value
-- SELECT id, name, summary_type FROM scorecard_metrics LIMIT 10;
