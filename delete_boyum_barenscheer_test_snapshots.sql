-- =====================================================================
-- SAFE SQL SCRIPT TO DELETE TEST MEETING SNAPSHOTS
-- Organization: Boyum and Barenscheer ONLY
-- Date Range: November 8-9, 2025
-- =====================================================================

-- STEP 1: Find the exact organization ID for Boyum and Barenscheer
-- Run this first to confirm you have the right organization
SELECT 
    id as organization_id,
    name as organization_name,
    created_at
FROM organizations
WHERE name ILIKE '%boyum%' 
   OR name ILIKE '%barenscheer%'
ORDER BY name;

-- Expected result: Should show 1 organization with a name like "Boyum and Barenscheer"
-- Copy the organization_id from the result above


-- =====================================================================
-- STEP 2: Preview what will be deleted
-- Replace 'YOUR_ORG_ID_HERE' with the actual organization_id from Step 1
-- =====================================================================

SELECT 
    ms.id as snapshot_id,
    ms.meeting_date,
    ms.meeting_type,
    ms.duration_minutes,
    o.name as organization_name,
    t.name as team_name,
    ms.created_at as snapshot_created_at
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
JOIN teams t ON ms.team_id = t.id
WHERE ms.organization_id = 'YOUR_ORG_ID_HERE'  -- ⚠️ REPLACE THIS
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date <= '2025-11-09 23:59:59'
ORDER BY ms.meeting_date DESC, ms.created_at DESC;


-- =====================================================================
-- STEP 3: Count how many snapshots will be deleted
-- Replace 'YOUR_ORG_ID_HERE' with the actual organization_id
-- =====================================================================

SELECT 
    COUNT(*) as total_snapshots_to_delete,
    MIN(meeting_date) as earliest_meeting_date,
    MAX(meeting_date) as latest_meeting_date,
    o.name as organization_name
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
WHERE ms.organization_id = 'YOUR_ORG_ID_HERE'  -- ⚠️ REPLACE THIS
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date <= '2025-11-09 23:59:59'
GROUP BY o.name;


-- =====================================================================
-- STEP 4: DELETE the snapshots (with transaction safety)
-- Replace 'YOUR_ORG_ID_HERE' with the actual organization_id
-- =====================================================================

BEGIN;

-- Store the organization name for verification
DO $$
DECLARE
    org_name TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get organization name first
    SELECT name INTO org_name
    FROM organizations
    WHERE id = 'YOUR_ORG_ID_HERE';  -- ⚠️ REPLACE THIS
    
    -- Safety check: Verify this is Boyum/Barenscheer
    IF org_name NOT ILIKE '%boyum%' AND org_name NOT ILIKE '%barenscheer%' THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: Organization "%" does not appear to be Boyum or Barenscheer. Aborting deletion.', org_name;
    END IF;
    
    RAISE NOTICE '✅ Safety check passed: Deleting snapshots for organization "%"', org_name;
    
    -- Perform the deletion
    DELETE FROM meeting_snapshots
    WHERE organization_id = 'YOUR_ORG_ID_HERE'  -- ⚠️ REPLACE THIS
      AND meeting_date >= '2025-11-08 00:00:00'
      AND meeting_date <= '2025-11-09 23:59:59';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '🗑️  Deleted % meeting snapshots for organization "%"', deleted_count, org_name;
    RAISE NOTICE '⚠️  Review the count above. If correct, run COMMIT; to save changes.';
    RAISE NOTICE '⚠️  If incorrect, run ROLLBACK; to undo changes.';
END $$;

-- ⚠️ IMPORTANT: Transaction is still open!
-- Review the output above, then choose one:
--   - If correct: COMMIT;
--   - If wrong:   ROLLBACK;


-- =====================================================================
-- STEP 5: Verify deletion was successful
-- Replace 'YOUR_ORG_ID_HERE' with the actual organization_id
-- =====================================================================

SELECT 
    COUNT(*) as remaining_snapshots_in_date_range
FROM meeting_snapshots
WHERE organization_id = 'YOUR_ORG_ID_HERE'  -- ⚠️ REPLACE THIS
  AND meeting_date >= '2025-11-08 00:00:00'
  AND meeting_date <= '2025-11-09 23:59:59';

-- Expected result: 0 rows (all test snapshots deleted)


-- =====================================================================
-- ALTERNATIVE: Delete using organization name (if you don't have ID)
-- =====================================================================

-- PREVIEW using organization name:
SELECT 
    ms.id,
    ms.meeting_date,
    ms.meeting_type,
    o.name as organization_name,
    t.name as team_name
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
JOIN teams t ON ms.team_id = t.id
WHERE (o.name ILIKE '%boyum%' OR o.name ILIKE '%barenscheer%')
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date <= '2025-11-09 23:59:59'
ORDER BY ms.meeting_date DESC;

-- DELETE using organization name (with safety check):
BEGIN;

DO $$
DECLARE
    deleted_count INTEGER;
    org_count INTEGER;
BEGIN
    -- Safety check: Verify only one organization matches
    SELECT COUNT(DISTINCT o.id) INTO org_count
    FROM organizations o
    WHERE o.name ILIKE '%boyum%' OR o.name ILIKE '%barenscheer%';
    
    IF org_count = 0 THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: No organization found matching Boyum or Barenscheer';
    END IF;
    
    IF org_count > 1 THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: Multiple organizations found. Please use organization_id instead.';
    END IF;
    
    -- Perform deletion
    DELETE FROM meeting_snapshots
    WHERE organization_id IN (
        SELECT id FROM organizations 
        WHERE name ILIKE '%boyum%' OR name ILIKE '%barenscheer%'
    )
    AND meeting_date >= '2025-11-08 00:00:00'
    AND meeting_date <= '2025-11-09 23:59:59';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '🗑️  Deleted % meeting snapshots', deleted_count;
    RAISE NOTICE '⚠️  Review the count. If correct, run COMMIT; otherwise run ROLLBACK;';
END $$;

-- Choose: COMMIT; or ROLLBACK;
