-- Migration: Fix priority_updates missing IDs
-- Date: 2025-08-08
-- Issue: Some priority_updates were created without IDs, making them undeletable

-- Check if there are any updates without IDs and delete them
-- These updates are broken and can't be properly managed
DO $$
BEGIN
  -- Log how many updates we're about to delete
  RAISE NOTICE 'Deleting % priority updates without IDs', 
    (SELECT COUNT(*) FROM priority_updates WHERE id IS NULL);
  
  -- Delete updates without IDs
  DELETE FROM priority_updates WHERE id IS NULL;
  
  -- Ensure all remaining updates have valid UUIDs
  UPDATE priority_updates
  SET id = gen_random_uuid()
  WHERE id = '' OR LENGTH(id) < 36;
  
  RAISE NOTICE 'All priority updates now have valid IDs';
END $$;

-- Add a CHECK constraint to ensure id is never null or empty (if not already present)
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'priority_updates_id_not_empty'
  ) THEN
    ALTER TABLE priority_updates 
    ADD CONSTRAINT priority_updates_id_not_empty 
    CHECK (id IS NOT NULL AND LENGTH(id) > 0);
    
    RAISE NOTICE 'Added constraint to ensure priority_updates.id is never empty';
  END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM priority_updates
  WHERE id IS NULL OR id = '' OR LENGTH(id) < 36;
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % priority updates with invalid IDs after migration', invalid_count;
  ELSE
    RAISE NOTICE 'Migration successful: All priority updates have valid IDs';
  END IF;
END $$;