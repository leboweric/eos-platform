-- Update existing Leadership Teams to have is_leadership_team flag set to true
-- This migration ensures backward compatibility for existing data

BEGIN;

-- Update any team named "Leadership Team" to have is_leadership_team = true
UPDATE teams 
SET is_leadership_team = true 
WHERE LOWER(name) = 'leadership team' 
  AND is_leadership_team = false;

-- Log how many teams were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % teams to have is_leadership_team = true', updated_count;
END $$;

COMMIT;