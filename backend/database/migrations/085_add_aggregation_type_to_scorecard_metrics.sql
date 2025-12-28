-- Add aggregation_type column to scorecard_metrics
-- This determines whether the 3-week moving calculation uses sum or average
-- 'sum' is for cumulative metrics (sales, rainmaking, expenses)
-- 'average' is for snapshot metrics (cash balance, utilization, headcount)

ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS aggregation_type VARCHAR(20) DEFAULT 'sum' CHECK (aggregation_type IN ('sum', 'average'));

-- Add comment for the new column
COMMENT ON COLUMN scorecard_metrics.aggregation_type IS 'Aggregation method for 3-week moving calculation: sum (for cumulative metrics like sales) or average (for snapshot metrics like cash balance)';

-- Set intelligent defaults based on value_type
-- Currency metrics are typically snapshots (cash balance, account balance) so use average
UPDATE scorecard_metrics 
SET aggregation_type = 'average' 
WHERE value_type = 'currency' AND aggregation_type = 'sum';

-- Percentage metrics should use average (already handled in code, but set it here too)
UPDATE scorecard_metrics 
SET aggregation_type = 'average' 
WHERE value_type = 'percentage' AND aggregation_type = 'sum';

-- Number metrics default to 'sum' which is already the default, so no update needed
-- Users can manually change specific metrics if needed
