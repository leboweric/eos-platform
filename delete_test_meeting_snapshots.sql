-- =====================================================
-- Delete Test Meeting Snapshots for Boyum and Barenscheer
-- Date Range: November 8-9, 2025
-- Purpose: Remove test snapshots created during bug fixing
-- =====================================================

-- STEP 1: VERIFY BEFORE DELETING
-- Run this first to see what will be deleted

SELECT 
    ms.id,
    ms.meeting_date,
    ms.meeting_type,
    ms.duration_minutes,
    o.name as organization_name,
    t.name as team_name,
    ms.created_at
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
LEFT JOIN teams t ON ms.team_id = t.id
WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date < '2025-11-10 00:00:00'
ORDER BY ms.meeting_date DESC;

-- STEP 2: COUNT SNAPSHOTS TO BE DELETED
-- Verify the count before proceeding

SELECT 
    o.name as organization_name,
    COUNT(*) as snapshot_count
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date < '2025-11-10 00:00:00'
GROUP BY o.name;

-- STEP 3: DELETE THE SNAPSHOTS
-- Only run this after verifying the above queries show the correct data

BEGIN;

DELETE FROM meeting_snapshots
WHERE id IN (
    SELECT ms.id
    FROM meeting_snapshots ms
    JOIN organizations o ON ms.organization_id = o.id
    WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
      AND ms.meeting_date >= '2025-11-08 00:00:00'
      AND ms.meeting_date < '2025-11-10 00:00:00'
);

-- Show how many rows were deleted
SELECT 'Deleted ' || ROW_COUNT() || ' meeting snapshots' as result;

-- COMMIT or ROLLBACK
-- If the count looks correct, run: COMMIT;
-- If something is wrong, run: ROLLBACK;

-- Uncomment one of the following:
-- COMMIT;
-- ROLLBACK;

-- STEP 4: VERIFY DELETION
-- Run this after committing to confirm deletion

SELECT 
    o.name as organization_name,
    COUNT(*) as remaining_snapshots
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date < '2025-11-10 00:00:00'
GROUP BY o.name;

-- Should return 0 rows if deletion was successful

-- =====================================================
-- ALTERNATIVE: Delete by specific organization ID
-- =====================================================
-- If you know the exact organization ID, use this instead:

-- First, find the organization ID:
-- SELECT id, name FROM organizations WHERE name LIKE '%Boyum%' OR name LIKE '%Barenscheer%';

-- Then delete using the specific ID:
-- DELETE FROM meeting_snapshots
-- WHERE organization_id = 'YOUR-ORG-ID-HERE'
--   AND meeting_date >= '2025-11-08 00:00:00'
--   AND meeting_date < '2025-11-10 00:00:00';
