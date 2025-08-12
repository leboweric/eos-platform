-- RESTORE: Move the three_year_picture BACK to team-level VTO where the UI expects it

DO $$
DECLARE
    v_org_level_vto_id UUID := '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';
    v_team_level_vto_id UUID := '430d2fd7-e6d7-4e5c-a83c-1b49c41c9fa8';
    v_three_year_picture_id UUID := '2e89f229-009a-4318-9604-af65b7df25ae';
BEGIN
    RAISE NOTICE 'Restoring three_year_picture BACK to team-level VTO';
    
    -- Move it back to the team-level VTO where the UI expects it
    UPDATE three_year_pictures
    SET vto_id = v_team_level_vto_id,
        updated_at = NOW()
    WHERE id = v_three_year_picture_id;
    
    RAISE NOTICE 'Restored three_year_picture to team-level VTO';
END $$;

-- Verify it's back
SELECT 
    'After restore:' as status,
    tp.id,
    tp.vto_id,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL'
        WHEN bb.team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' THEN 'TEAM-LEVEL (Leadership)'
    END as vto_type,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- Now let's fix it the RIGHT way - copy the data instead of moving it
-- This way both the UI and the toggle function will work

-- First check if org-level three_year_picture exists
SELECT 'Org-level three_year_picture:' as check,
       tp.*
FROM three_year_pictures tp
WHERE vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f';

-- Copy the three_year_picture data to ALSO exist on the org-level VTO
INSERT INTO three_year_pictures (
    id,
    vto_id,
    future_date,
    revenue,
    profit,
    measurables,
    what_does_it_look_like,
    what_does_it_look_like_completions,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f', -- org-level VTO
    future_date,
    revenue,
    profit,
    measurables,
    what_does_it_look_like,
    what_does_it_look_like_completions,
    NOW(),
    NOW()
FROM three_year_pictures
WHERE id = '2e89f229-009a-4318-9604-af65b7df25ae'
  AND NOT EXISTS (
      SELECT 1 FROM three_year_pictures 
      WHERE vto_id = '6a07f0ab-c4bd-4d93-a1b3-9440ca1e5a3f'
  );

-- Verify we now have BOTH
SELECT 
    'Final state:' as status,
    tp.id,
    tp.vto_id,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (for toggle)'
        WHEN bb.team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' THEN 'TEAM-LEVEL (for UI display)'
    END as vto_type,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
ORDER BY bb.team_id NULLS FIRST;