-- Quick fix to delete updates for a specific priority
-- Replace 'YOUR_PRIORITY_ID' with the actual priority ID

-- Option 1: Delete ALL updates for a specific priority
-- Use this if you want to clear all updates for a priority and start fresh
DELETE FROM priority_updates 
WHERE priority_id = 'b3152418-5e02-4d82-aaff-953fdb456891';

-- Option 2: Delete updates without IDs for a specific priority
-- DELETE FROM priority_updates 
-- WHERE priority_id = 'YOUR_PRIORITY_ID' 
--   AND (id IS NULL OR id = '');

-- Option 3: Delete ALL updates that don't have proper IDs (across all priorities)
-- DELETE FROM priority_updates 
-- WHERE id IS NULL OR id = '' OR LENGTH(id) < 36;

-- Option 4: See what updates exist for a priority
-- SELECT id, update_text, created_at 
-- FROM priority_updates 
-- WHERE priority_id = 'YOUR_PRIORITY_ID'
-- ORDER BY created_at DESC;