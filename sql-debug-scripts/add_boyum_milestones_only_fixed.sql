-- =====================================================
-- Add Milestones to Existing Boyum Priority
-- Priority ID: 54d5faca-2f45-49ec-af65-bed66db393ce
-- =====================================================

BEGIN;

DO $$
DECLARE
    p_id UUID := '54d5faca-2f45-49ec-af65-bed66db393ce';
BEGIN
    -- First, clear any existing milestones for this priority
    DELETE FROM priority_milestones WHERE priority_id = p_id;
    
    -- Insert milestones with correct column names
    INSERT INTO priority_milestones (id, priority_id, title, due_date, completed, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), p_id, 'Assign $25k/Partner', '2025-07-23'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Karbon work items set up', '2025-07-25'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Sell sheet for OB3 Analysis', '2025-07-28'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Data Mining', '2025-07-31'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Discussion points for firm growth meeting', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Develop a recognition program', '2025-08-01'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Contact Referral Sources (All)', '2025-08-08'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Develop WIP Thermometer', '2025-08-12'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Update Website', '2025-08-15'::DATE, false, NOW(), NOW()),
        (gen_random_uuid(), p_id, 'Training on how to sell the OB3', '2025-08-31'::DATE, false, NOW(), NOW());
    
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
    pm.title as milestone,
    pm.due_date,
    pm.completed
FROM priority_milestones pm
WHERE pm.priority_id = '54d5faca-2f45-49ec-af65-bed66db393ce'
ORDER BY pm.due_date;

-- Count check
SELECT 
    'TOTAL' as check_type,
    p.title as priority,
    COUNT(pm.id) as milestone_count
FROM quarterly_priorities p
LEFT JOIN priority_milestones pm ON pm.priority_id = p.id
WHERE p.id = '54d5faca-2f45-49ec-af65-bed66db393ce'
GROUP BY p.id, p.title;