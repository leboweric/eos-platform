-- Add custom pricing flag to organizations table
-- Organizations with custom pricing will not see standard plan options

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS has_custom_pricing BOOLEAN DEFAULT FALSE;

-- Add custom pricing details (optional - for admin reference)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS custom_pricing_amount DECIMAL(10,2) DEFAULT NULL;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS custom_pricing_notes TEXT DEFAULT NULL;

-- Set custom pricing for the three organizations
UPDATE organizations 
SET has_custom_pricing = TRUE,
    custom_pricing_amount = 500.00,
    custom_pricing_notes = 'Special pricing arrangement - $500/month'
WHERE id IN (
    '3afe7525-7146-487c-af9c-b45c558ed6d4',  -- Sandia Plastics
    '6da964fe-fa6f-4c45-b6d0-4c1f82176569',  -- Kauai Exclusive
    'ea14e0b6-1115-4f6d-ac58-ac7e2fab1362'   -- Hawaii Care & Cleaning
);

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_organizations_custom_pricing ON organizations(has_custom_pricing) WHERE has_custom_pricing = TRUE;
