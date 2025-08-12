-- Final debug for Field Outdoor Spaces add/delete issues

-- 1. Current exact state
SELECT 
    'Current state:' as check,
    tp.id,
    tp.vto_id,
    tp.what_does_it_look_like,
    tp.what_does_it_look_like_completions,
    tp.updated_at,
    bb.id as blueprint_id,
    bb.team_id
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- 2. Try a manual update to simulate adding an item
UPDATE three_year_pictures 
SET what_does_it_look_like = '["Test Item 1", "Test Item 2", "Test Item 3", "New Item Added Via SQL"]'::jsonb,
    updated_at = NOW()
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- 3. Check after update
SELECT 
    'After manual add:' as status,
    what_does_it_look_like
FROM three_year_pictures 
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- 4. Try to delete (set to empty array)
UPDATE three_year_pictures 
SET what_does_it_look_like = '[]'::jsonb,
    what_does_it_look_like_completions = '{}'::jsonb,
    updated_at = NOW()
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- 5. Check after delete
SELECT 
    'After manual delete:' as status,
    what_does_it_look_like,
    what_does_it_look_like_completions
FROM three_year_pictures 
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';

-- 6. Restore the test items
UPDATE three_year_pictures 
SET what_does_it_look_like = '["Test Item 1", "Test Item 2", "Test Item 3"]'::jsonb,
    updated_at = NOW()
WHERE id = '62caa73a-a55e-4bad-b7e5-39cb374013a9';