-- Migration: Add rock display preference to organizations
-- Date: 2024-10-05
-- Purpose: Allow organizations to configure how rocks are organized in meetings and priorities page
--          Supports different EOS facilitation styles and Adaptive Framework Technology

-- Add rock display preference column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS rock_display_preference VARCHAR(50) 
DEFAULT 'grouped_by_owner';

-- Add check constraint to ensure only valid values are allowed
ALTER TABLE organizations
ADD CONSTRAINT chk_rock_display_preference 
CHECK (rock_display_preference IN ('grouped_by_type', 'grouped_by_owner'));

-- Add comment explaining the column and valid values
COMMENT ON COLUMN organizations.rock_display_preference IS 
'Controls Rock organization in meetings and priorities page. Valid values: grouped_by_type (Company Rocks then Individual Rocks sections), grouped_by_owner (by person with Company badge). Supports different EOS facilitation styles within Adaptive Framework Technology.';

-- Update existing organizations to have default value (safety check)
UPDATE organizations 
SET rock_display_preference = 'grouped_by_owner' 
WHERE rock_display_preference IS NULL;

-- Verify the migration worked
SELECT 
    id,
    name,
    rock_display_preference
FROM organizations 
LIMIT 5;

-- Migration complete
-- Next steps: Update organizationController.js to handle this field