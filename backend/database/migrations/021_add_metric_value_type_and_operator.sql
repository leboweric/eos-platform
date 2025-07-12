-- Add value_type and comparison_operator columns to scorecard_metrics
ALTER TABLE scorecard_metrics 
ADD COLUMN IF NOT EXISTS value_type VARCHAR(20) DEFAULT 'number' CHECK (value_type IN ('number', 'currency', 'percentage')),
ADD COLUMN IF NOT EXISTS comparison_operator VARCHAR(10) DEFAULT 'greater_equal' CHECK (comparison_operator IN ('greater_equal', 'less_equal', 'equal'));

-- Add comments for the new columns
COMMENT ON COLUMN scorecard_metrics.value_type IS 'Type of value: number, currency, or percentage';
COMMENT ON COLUMN scorecard_metrics.comparison_operator IS 'Comparison operator for goal achievement: greater_equal (≥), less_equal (≤), or equal (=)';

-- Update existing metrics to have default values
UPDATE scorecard_metrics 
SET value_type = 'number', comparison_operator = 'greater_equal' 
WHERE value_type IS NULL OR comparison_operator IS NULL;