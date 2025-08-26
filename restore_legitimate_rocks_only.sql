-- Restore ONLY the legitimate rocks for Strategic Consulting & Coaching
-- Skip the test rocks

-- 1. Preview what we'll restore (non-test rocks deleted on Aug 9, 2025)
SELECT 
    id,
    title,
    'Q' || quarter || ' ' || year as period,
    deleted_at::date as deleted_date,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as owner
FROM quarterly_priorities qp
LEFT JOIN users u ON u.id = qp.owner_id
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND qp.deleted_at IS NOT NULL
    AND qp.deleted_at::date = '2025-08-09'  -- Only the Aug 9 deletions
    AND LOWER(qp.title) NOT LIKE '%test%'   -- Exclude test rocks
    AND LOWER(qp.title) NOT IN ('etr', 'reddfd', 'trests')  -- Exclude obvious test data
ORDER BY qp.quarter DESC;

-- 2. Count how many legitimate rocks we'll restore
SELECT 
    COUNT(*) as legitimate_rocks_to_restore
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL
    AND deleted_at::date = '2025-08-09'
    AND LOWER(title) NOT LIKE '%test%'
    AND LOWER(title) NOT IN ('etr', 'reddfd', 'trests');

-- 3. RESTORE ONLY THE LEGITIMATE ROCKS
UPDATE quarterly_priorities
SET deleted_at = NULL
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL
    AND deleted_at::date = '2025-08-09'  -- Only Aug 9 deletions
    AND LOWER(title) NOT LIKE '%test%'   -- Exclude test rocks
    AND LOWER(title) NOT IN ('etr', 'reddfd', 'trests');  -- Exclude obvious test data

-- 4. Verify restoration
SELECT 
    title,
    'Q' || quarter || ' ' || year as period,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as owner,
    status,
    progress || '%' as progress
FROM quarterly_priorities qp
LEFT JOIN users u ON u.id = qp.owner_id
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND qp.deleted_at IS NULL  -- Now active
ORDER BY qp.year DESC, qp.quarter DESC;

-- 5. Alternative: If they really want NO rocks, then they're correct as-is
-- This query confirms all rocks remain deleted
SELECT 
    'Strategic Consulting & Coaching has ' || COUNT(*) || ' active rocks' as status
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NULL;