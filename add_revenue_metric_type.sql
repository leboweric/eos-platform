-- Manual script to add revenue metric type to organizations
-- Run this if you need to apply the migration manually

-- Check current organizations
SELECT id, name, revenue_metric_type, revenue_metric_label 
FROM organizations
ORDER BY name;

-- Add columns if they don't exist
DO $$ 
BEGIN
    -- Add revenue_metric_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='organizations' AND column_name='revenue_metric_type'
    ) THEN
        ALTER TABLE organizations
        ADD COLUMN revenue_metric_type VARCHAR(20) DEFAULT 'revenue' 
        CHECK (revenue_metric_type IN ('revenue', 'aum', 'arr', 'custom'));
        
        COMMENT ON COLUMN organizations.revenue_metric_type IS 
        'Type of revenue metric: revenue (default), aum (Assets Under Management), arr (Annual Recurring Revenue), or custom';
    END IF;

    -- Add revenue_metric_label if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='organizations' AND column_name='revenue_metric_label'
    ) THEN
        ALTER TABLE organizations
        ADD COLUMN revenue_metric_label VARCHAR(50);
        
        COMMENT ON COLUMN organizations.revenue_metric_label IS 
        'Custom label for revenue metric when type is "custom"';
    END IF;
END $$;

-- Set default values for existing organizations
UPDATE organizations 
SET revenue_metric_type = 'revenue' 
WHERE revenue_metric_type IS NULL;

-- Verify the changes
SELECT id, name, revenue_metric_type, revenue_metric_label 
FROM organizations
ORDER BY name;

-- Example: Set specific organizations to use different metrics
-- UPDATE organizations SET revenue_metric_type = 'aum' WHERE name = 'Wealth Management Firm';
-- UPDATE organizations SET revenue_metric_type = 'arr' WHERE name = 'SaaS Company';
-- UPDATE organizations SET revenue_metric_type = 'custom', revenue_metric_label = 'GMV' WHERE name = 'E-commerce Platform';