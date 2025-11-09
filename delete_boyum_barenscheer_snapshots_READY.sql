-- =====================================================================
-- READY-TO-RUN SQL SCRIPT TO DELETE TEST MEETING SNAPSHOTS
-- Organization: Boyum Barenscheer (ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e)
-- Date Range: November 8-9, 2025
-- =====================================================================

-- STEP 1: Verify the organization (should show "Boyum Barenscheer")
SELECT 
    id as organization_id,
    name as organization_name,
    created_at
FROM organizations
WHERE id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- Expected: "Boyum Barenscheer"


-- =====================================================================
-- STEP 2: Preview what will be deleted
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
WHERE ms.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date <= '2025-11-09 23:59:59'
ORDER BY ms.meeting_date DESC, ms.created_at DESC;


-- =====================================================================
-- STEP 3: Count how many snapshots will be deleted
-- =====================================================================

SELECT 
    COUNT(*) as total_snapshots_to_delete,
    MIN(meeting_date) as earliest_meeting_date,
    MAX(meeting_date) as latest_meeting_date,
    o.name as organization_name
FROM meeting_snapshots ms
JOIN organizations o ON ms.organization_id = o.id
WHERE ms.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND ms.meeting_date >= '2025-11-08 00:00:00'
  AND ms.meeting_date <= '2025-11-09 23:59:59'
GROUP BY o.name;


-- =====================================================================
-- STEP 4: DELETE the snapshots (with transaction safety)
-- =====================================================================

BEGIN;

DO $$
DECLARE
    org_name TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get organization name for verification
    SELECT name INTO org_name
    FROM organizations
    WHERE id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
    
    -- Safety check: Verify this is Boyum Barenscheer
    IF org_name NOT ILIKE '%boyum%' AND org_name NOT ILIKE '%barenscheer%' THEN
        RAISE EXCEPTION 'SAFETY CHECK FAILED: Organization "%" does not appear to be Boyum or Barenscheer. Aborting deletion.', org_name;
    END IF;
    
    RAISE NOTICE '✅ Safety check passed: Deleting snapshots for organization "%"', org_name;
    
    -- Perform the deletion
    DELETE FROM meeting_snapshots
    WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
      AND meeting_date >= '2025-11-08 00:00:00'
      AND meeting_date <= '2025-11-09 23:59:59';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE '🗑️  Deleted % meeting snapshots for organization "%"', deleted_count, org_name;
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  TRANSACTION IS STILL OPEN!';
    RAISE NOTICE '⚠️  Review the count above.';
    RAISE NOTICE '⚠️  If correct, run: COMMIT;';
    RAISE NOTICE '⚠️  If incorrect, run: ROLLBACK;';
END $$;

-- ⚠️ IMPORTANT: Choose one of the following:
--   COMMIT;     -- To save the deletion
--   ROLLBACK;   -- To undo the deletion


-- =====================================================================
-- STEP 5: Verify deletion was successful (run AFTER commit)
-- =====================================================================

SELECT 
    COUNT(*) as remaining_snapshots_in_date_range
FROM meeting_snapshots
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND meeting_date >= '2025-11-08 00:00:00'
  AND meeting_date <= '2025-11-09 23:59:59';

-- Expected result: 0 (all test snapshots deleted)


-- =====================================================================
-- BONUS: Check all remaining snapshots for this organization
-- =====================================================================

SELECT 
    meeting_date,
    meeting_type,
    COUNT(*) as snapshot_count
FROM meeting_snapshots
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
GROUP BY meeting_date, meeting_type
ORDER BY meeting_date DESC;
