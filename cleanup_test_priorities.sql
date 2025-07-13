-- Cleanup script to remove test priorities and properly handle deleted priorities
-- Run this on the production database

-- First, let's see what we're dealing with
SELECT 
  id, 
  title, 
  description,
  deleted_at,
  is_company_priority,
  created_at
FROM quarterly_priorities 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%trests%'
   OR title ILIKE '%reddfd%'
   OR description ILIKE '%test%'
   OR description ILIKE '%dddd%'
   OR description ILIKE '%dfdfd%'
   OR description ILIKE '%ddsdfsdfsd%'
ORDER BY created_at DESC;

-- Remove test priorities (uncomment to execute)
/*
DELETE FROM quarterly_priorities 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%trests%'
   OR title ILIKE '%reddfd%'
   OR description ILIKE '%test%'
   OR description ILIKE '%dddd%'
   OR description ILIKE '%dfdfd%'
   OR description ILIKE '%ddsdfsdfsd%';
*/

-- Alternative: Set deleted_at for test priorities instead of hard delete
/*
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
*/

-- Check for any priorities that should be archived but aren't
SELECT 
  id,
  title,
  owner_id,
  deleted_at,
  created_at
FROM quarterly_priorities 
WHERE deleted_at IS NULL
ORDER BY created_at ASC;