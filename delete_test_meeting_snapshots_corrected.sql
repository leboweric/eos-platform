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

-- STEP 3: DELETE THE SNAPSHOTS (CORRECTED VERSION)
-- Only run this after verifying the above queries show the correct data

DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Start transaction
    -- Perform the delete
    DELETE FROM meeting_snapshots
    WHERE id IN (
        SELECT ms.id
        FROM meeting_snapshots ms
        JOIN organizations o ON ms.organization_id = o.id
        WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
          AND ms.meeting_date >= '2025-11-08 00:00:00'
          AND ms.meeting_date < '2025-11-10 00:00:00'
    );
    
    -- Get the number of deleted rows
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Display the result
    RAISE NOTICE 'Deleted % meeting snapshots', deleted_count;
END $$;

-- STEP 4: VERIFY DELETION
-- Run this after the delete to confirm deletion

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
-- ALTERNATIVE: Simple DELETE with RETURNING
-- =====================================================
-- This version shows what was deleted and is simpler

/*
WITH deleted AS (
    DELETE FROM meeting_snapshots
    WHERE id IN (
        SELECT ms.id
        FROM meeting_snapshots ms
        JOIN organizations o ON ms.organization_id = o.id
        WHERE o.name IN ('Boyum Barenscheer', 'Boyum & Barenscheer', 'Boyum', 'Barenscheer')
          AND ms.meeting_date >= '2025-11-08 00:00:00'
          AND ms.meeting_date < '2025-11-10 00:00:00'
    )
    RETURNING *
)
SELECT 
    COUNT(*) as deleted_count,
    MIN(meeting_date) as earliest_date,
    MAX(meeting_date) as latest_date
FROM deleted;
*/

-- =====================================================
-- ALTERNATIVE: Delete by specific organization ID
-- =====================================================
-- If you know the exact organization ID, use this instead:

-- First, find the organization ID:
-- SELECT id, name FROM organizations WHERE name LIKE '%Boyum%' OR name LIKE '%Barenscheer%';

-- Then delete using the specific ID:
/*
WITH deleted AS (
    DELETE FROM meeting_snapshots
    WHERE organization_id = 'YOUR-ORG-ID-HERE'
      AND meeting_date >= '2025-11-08 00:00:00'
      AND meeting_date < '2025-11-10 00:00:00'
    RETURNING *
)
SELECT 
    COUNT(*) as deleted_count,
    STRING_AGG(DISTINCT meeting_type, ', ') as meeting_types
FROM deleted;
*/
