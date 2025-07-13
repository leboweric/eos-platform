-- Migration to clean up test priorities
-- This will soft-delete (archive) test priorities instead of hard deleting them

-- First, let's see what we're cleaning up
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count
    FROM quarterly_priorities 
    WHERE (title ILIKE '%test%' 
       OR title ILIKE '%trests%'
       OR title ILIKE '%reddfd%'
       OR description ILIKE '%test%'
       OR description ILIKE '%dddd%'
       OR description ILIKE '%dfdfd%'
       OR description ILIKE '%ddsdfsdfsd%')
    AND deleted_at IS NULL;
    
    RAISE NOTICE 'Found % test priorities to clean up', test_count;
END $$;

-- Archive (soft delete) test priorities by setting deleted_at
UPDATE quarterly_priorities 
SET deleted_at = NOW()
WHERE (title ILIKE '%test%' 
   OR title ILIKE '%trests%'
   OR title ILIKE '%reddfd%'
   OR description ILIKE '%test%'
   OR description ILIKE '%dddd%'
   OR description ILIKE '%dfdfd%'
   OR description ILIKE '%ddsdfsdfsd%')
AND deleted_at IS NULL;

-- Report results
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM quarterly_priorities 
    WHERE deleted_at IS NULL;
    
    RAISE NOTICE 'Cleanup complete. % active priorities remaining', remaining_count;
END $$;