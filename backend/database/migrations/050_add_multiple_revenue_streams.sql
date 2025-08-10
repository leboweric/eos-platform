-- =====================================================
-- Add support for multiple revenue streams
-- Allows organizations to track separate revenue sources
-- (e.g., Boyum's Accounting and Wealth Management)
-- =====================================================

-- Create revenue streams table for 3-Year Picture
CREATE TABLE IF NOT EXISTS three_year_revenue_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    three_year_picture_id UUID NOT NULL REFERENCES three_year_pictures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    revenue_target DECIMAL(20, 2),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(three_year_picture_id, name)
);

-- Create revenue streams table for 1-Year Plan
CREATE TABLE IF NOT EXISTS one_year_revenue_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    one_year_plan_id UUID NOT NULL REFERENCES one_year_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    revenue_target DECIMAL(20, 2),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(one_year_plan_id, name)
);

-- Add indexes for performance
CREATE INDEX idx_three_year_revenue_streams_picture_id ON three_year_revenue_streams(three_year_picture_id);
CREATE INDEX idx_one_year_revenue_streams_plan_id ON one_year_revenue_streams(one_year_plan_id);

-- Add comments for documentation
COMMENT ON TABLE three_year_revenue_streams IS 'Stores multiple revenue stream targets for 3-year picture';
COMMENT ON TABLE one_year_revenue_streams IS 'Stores multiple revenue stream targets for 1-year plan';
COMMENT ON COLUMN three_year_revenue_streams.name IS 'Name of the revenue stream (e.g., Accounting, Wealth Management)';
COMMENT ON COLUMN one_year_revenue_streams.name IS 'Name of the revenue stream (e.g., Accounting, Wealth Management)';
COMMENT ON COLUMN three_year_revenue_streams.display_order IS 'Order in which to display revenue streams';
COMMENT ON COLUMN one_year_revenue_streams.display_order IS 'Order in which to display revenue streams';

-- Migrate existing revenue data to the new structure
-- This preserves existing single revenue values as "Total Revenue" stream

-- For 3-Year Picture
INSERT INTO three_year_revenue_streams (three_year_picture_id, name, revenue_target, display_order)
SELECT 
    id as three_year_picture_id,
    'Total Revenue' as name,
    revenue_target,
    0 as display_order
FROM three_year_pictures
WHERE revenue_target IS NOT NULL AND revenue_target > 0
ON CONFLICT (three_year_picture_id, name) DO NOTHING;

-- For 1-Year Plan
INSERT INTO one_year_revenue_streams (one_year_plan_id, name, revenue_target, display_order)
SELECT 
    id as one_year_plan_id,
    'Total Revenue' as name,
    revenue_target,
    0 as display_order
FROM one_year_plans
WHERE revenue_target IS NOT NULL AND revenue_target > 0
ON CONFLICT (one_year_plan_id, name) DO NOTHING;

-- Note: We're keeping the original revenue_target columns in three_year_pictures 
-- and one_year_plans tables for backward compatibility. They can be deprecated
-- in a future migration once all code is updated to use the new tables.