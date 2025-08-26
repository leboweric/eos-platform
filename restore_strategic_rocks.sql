-- Restore Strategic Consulting & Coaching's deleted rocks

-- 1. First, let's see what we're about to restore (preview)
SELECT 
    id,
    title,
    quarter || ' ' || year as period,
    CASE 
        WHEN deleted_at IS NOT NULL THEN 'DELETED on ' || deleted_at::date
        ELSE 'Active'
    END as status,
    deleted_at
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL
ORDER BY year DESC, quarter DESC;

-- 2. Count how many we'll restore
SELECT 
    COUNT(*) as rocks_to_restore,
    STRING_AGG(DISTINCT 'Q' || quarter || ' ' || year, ', ') as quarters
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL;

-- 3. RESTORE ALL DELETED ROCKS FOR STRATEGIC CONSULTING
-- This will make them visible in the UI again
UPDATE quarterly_priorities
SET deleted_at = NULL
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL;

-- 4. Verify the restoration worked
SELECT 
    COUNT(*) as active_rocks,
    STRING_AGG(DISTINCT 'Q' || quarter || ' ' || year, ', ') as quarters
FROM quarterly_priorities
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NULL;

-- 5. Show the restored rocks
SELECT 
    title,
    'Q' || quarter || ' ' || year as period,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') as owner,
    status,
    progress || '%' as progress
FROM quarterly_priorities qp
LEFT JOIN users u ON u.id = qp.owner_id
WHERE qp.organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND qp.deleted_at IS NULL
ORDER BY qp.year DESC, qp.quarter DESC, qp.created_at DESC;

-- 6. Optional: If you only want to restore Q1 2025 rocks (current quarter)
-- Use this instead of query #3 if you only want current quarter
/*
UPDATE quarterly_priorities
SET deleted_at = NULL
WHERE organization_id = 'e2f66db4-ded7-4be9-b79c-e8749c8dbd89'
    AND deleted_at IS NOT NULL
    AND year = 2025
    AND quarter = 1;
*/