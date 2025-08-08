-- Fix for priority_updates missing IDs
-- Run this script to clean up and fix existing updates

-- 1. First, let's see how many updates don't have IDs
SELECT COUNT(*) as updates_without_ids
FROM priority_updates
WHERE id IS NULL;

-- 2. Show sample of updates without IDs (if any)
SELECT priority_id, update_text, created_at, created_by
FROM priority_updates
WHERE id IS NULL
LIMIT 5;

-- 3. Delete all updates without IDs (they can't be managed properly anyway)
DELETE FROM priority_updates
WHERE id IS NULL;

-- 4. Add UUIDs to any updates that somehow have empty string IDs
UPDATE priority_updates
SET id = gen_random_uuid()
WHERE id = '' OR id IS NULL;

-- 5. Verify all updates now have IDs
SELECT 
  COUNT(*) as total_updates,
  COUNT(id) as updates_with_ids,
  COUNT(*) - COUNT(id) as updates_missing_ids
FROM priority_updates;

-- 6. Show recent updates to verify they have IDs
SELECT 
  id,
  priority_id,
  update_text,
  created_at,
  created_by
FROM priority_updates
ORDER BY created_at DESC
LIMIT 10;

-- 7. Optional: If you want to delete ALL existing updates and start fresh
-- WARNING: This will delete ALL priority updates!
-- Uncomment the line below only if you want to delete everything
-- DELETE FROM priority_updates;

-- 8. Ensure the id column has proper constraints
-- This should already be set, but let's verify
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'priority_updates' 
  AND column_name = 'id';