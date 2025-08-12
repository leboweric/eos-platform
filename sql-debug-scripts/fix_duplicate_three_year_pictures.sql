-- Fix Field Outdoor Spaces duplicate three_year_pictures

-- 1. Show both records with details
SELECT 
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    tp.created_at,
    tp.updated_at,
    bb.organization_id,
    o.name as org_name
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
ORDER BY tp.created_at;

-- 2. The fix: Keep the newer one with more data, delete the old one with just "test"
BEGIN;

-- Delete the older record with just "test"
DELETE FROM three_year_pictures 
WHERE id = '2e89f229-009a-4318-9604-af65b7df25ae';

-- Verify only one remains
SELECT COUNT(*) as remaining_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';

COMMIT;

-- 3. Verify the fix
SELECT 
    'After fix:' as status,
    tp.id,
    tp.what_does_it_look_like,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces';