-- Add greater_than and less_than to comparison_operator check constraint
-- This migration updates the existing constraint to support more operator types

-- Drop the existing check constraint
ALTER TABLE scorecard_metrics 
DROP CONSTRAINT IF EXISTS scorecard_metrics_comparison_operator_check;

-- Add the new check constraint with additional operators
ALTER TABLE scorecard_metrics 
ADD CONSTRAINT scorecard_metrics_comparison_operator_check 
CHECK (comparison_operator IN ('greater_than', 'greater_equal', 'less_than', 'less_equal', 'equal'));

-- Update the comment to reflect new operators
COMMENT ON COLUMN scorecard_metrics.comparison_operator IS 'Comparison operator for goal achievement: greater_than (>), greater_equal (≥), less_than (<), less_equal (≤), or equal (=)';
