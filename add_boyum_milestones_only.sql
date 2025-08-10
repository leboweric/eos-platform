-- =====================================================
-- Add Milestones to Boyum's First Priority
-- =====================================================

-- Clear any failed transactions
ROLLBACK;

BEGIN;

DO $$
DECLARE
    priority_id UUID;
BEGIN
    -- Get the priority ID we just created
    SELECT id INTO priority_id
    FROM quarterly_priorities
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
    AND title = '$500K of new revenue from OB3'
    AND quarter = 'Q3'
    AND year = 2025
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF priority_id IS NULL THEN
        RAISE EXCEPTION 'Priority not found - please run the priority creation script first';
    END IF;
    
    RAISE NOTICE 'Found Priority ID: %', priority_id;
    
    -- Delete any existing milestones for this priority (in case of re-run)
    DELETE FROM priority_milestones WHERE priority_id = priority_id;
    
    -- Insert milestones with correct column names
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), priority_id, 'Assign $25k/Partner', '2025-07-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Karbon work items set up', '2025-07-25'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Sell sheet for OB3 Analysis', '2025-07-28'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Data Mining', '2025-07-31'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Discussion points for firm growth meeting', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Develop a recognition program', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Contact Referral Sources (All)', '2025-08-08'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Develop WIP Thermometer', '2025-08-12'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Update Website', '2025-08-15'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), priority_id, 'Training on how to sell the OB3', '2025-08-31'::DATE, false, NOW(), NOW());  -- Used end of Aug since no date specified
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Milestones Added Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Added 10 milestones to priority: $500K of new revenue from OB3';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the milestones were added
SELECT 
    'MILESTONE' as check_type,
    pm.title,
    pm.due_date,
    pm.completed,
    p.title as priority_title
FROM priority_milestones pm
JOIN quarterly_priorities p ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.title = '$500K of new revenue from OB3'
ORDER BY pm.due_date;

-- Count check
SELECT 
    'TOTAL' as check_type,
    p.title as priority,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
AND p.quarter = 'Q3'
AND p.year = 2025
GROUP BY p.id, p.title;