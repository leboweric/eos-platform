-- Deep check of Field Outdoor Spaces data structure

-- 1. Check ALL three_year_pictures that might exist
SELECT 
    'All three_year_pictures:' as check,
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    tp.updated_at,
    bb.organization_id,
    bb.team_id,
    o.name as org_name
FROM three_year_pictures tp
LEFT JOIN business_blueprints bb ON bb.id = tp.vto_id
LEFT JOIN organizations o ON o.id = bb.organization_id
WHERE o.name = 'Field Outdoor Spaces'
   OR tp.id IN ('62caa73a-a55e-4bad-b7e5-39cb374013a9', '2e89f229-009a-4318-9604-af65b7df25ae')
   OR tp.vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';

-- 2. Check data type and structure
SELECT 
    'Data structure check:' as check,
    tp.id,
    pg_typeof(tp.what_does_it_look_like) as data_type,
    tp.what_does_it_look_like::text as raw_text,
    CASE 
        WHEN tp.what_does_it_look_like IS NULL THEN 'NULL'
        WHEN tp.what_does_it_look_like::text = '[]' THEN 'EMPTY ARRAY'
        WHEN tp.what_does_it_look_like::text LIKE '[%]' THEN 'VALID JSON ARRAY'
        ELSE 'INVALID FORMAT'
    END as format_check
FROM three_year_pictures tp
WHERE tp.vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';

-- 3. Try to read the current data as JSONB
SELECT 
    'JSONB parse check:' as check,
    tp.id,
    tp.what_does_it_look_like::jsonb as parsed_jsonb,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as array_length,
    jsonb_typeof(tp.what_does_it_look_like::jsonb) as jsonb_type
FROM three_year_pictures tp
WHERE tp.vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';

-- 4. Manual test - try to update it directly
UPDATE three_year_pictures 
SET what_does_it_look_like = '["Test Item 1", "Test Item 2", "Test Item 3"]'::jsonb,
    updated_at = NOW()
WHERE vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';

-- 5. Check after manual update
SELECT 
    'After manual update:' as status,
    tp.id,
    tp.what_does_it_look_like,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
WHERE tp.vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';