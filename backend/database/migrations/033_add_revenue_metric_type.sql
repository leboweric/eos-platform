-- Add revenue metric type and custom label to organizations table
-- This allows organizations to choose between Revenue, AUM, ARR, or custom metrics

-- Add revenue_metric_type column with default 'revenue'
ALTER TABLE organizations
ADD COLUMN revenue_metric_type VARCHAR(20) DEFAULT 'revenue' CHECK (revenue_metric_type IN ('revenue', 'aum', 'arr', 'custom'));

-- Add revenue_metric_label column for custom labels
ALTER TABLE organizations
ADD COLUMN revenue_metric_label VARCHAR(50);

-- Add comment to explain the columns
COMMENT ON COLUMN organizations.revenue_metric_type IS 'Type of revenue metric: revenue (default), aum (Assets Under Management), arr (Annual Recurring Revenue), or custom';
COMMENT ON COLUMN organizations.revenue_metric_label IS 'Custom label for revenue metric when type is "custom"';

-- Update existing organizations to have explicit 'revenue' type
UPDATE organizations 
SET revenue_metric_type = 'revenue' 
WHERE revenue_metric_type IS NULL;