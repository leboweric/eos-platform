-- Move the three_year_picture from team-level VTO to org-level VTO

DO $$
DECLARE
    v_org_level_vto_id UUID;
    v_team_level_vto_id UUID;
    v_three_year_picture_id UUID;
BEGIN
    -- Get the org-level VTO ID (team_id IS NULL)
    SELECT id INTO v_org_level_vto_id
    FROM business_blueprints
    WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
      AND team_id IS NULL
    LIMIT 1;
    
    -- Get the team-level VTO ID (for leadership team)
    SELECT id INTO v_team_level_vto_id
    FROM business_blueprints
    WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
      AND team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626'
    LIMIT 1;
    
    -- Get the three_year_picture that has the actual data
    SELECT id INTO v_three_year_picture_id
    FROM three_year_pictures
    WHERE vto_id = v_team_level_vto_id
    LIMIT 1;
    
    IF v_three_year_picture_id IS NOT NULL AND v_org_level_vto_id IS NOT NULL THEN
        RAISE NOTICE 'Moving three_year_picture from team-level VTO to org-level VTO';
        RAISE NOTICE 'Three year picture ID: %', v_three_year_picture_id;
        RAISE NOTICE 'From VTO: % (team-level)', v_team_level_vto_id;
        RAISE NOTICE 'To VTO: % (org-level)', v_org_level_vto_id;
        
        -- First delete any empty three_year_picture on the org-level VTO
        -- Fixed: Cast what_does_it_look_like to jsonb for comparison
        DELETE FROM three_year_pictures 
        WHERE vto_id = v_org_level_vto_id
          AND (what_does_it_look_like::jsonb = '[]'::jsonb 
               OR what_does_it_look_like IS NULL
               OR jsonb_array_length(what_does_it_look_like::jsonb) = 0);
        
        -- Move the three_year_picture to the correct VTO
        UPDATE three_year_pictures
        SET vto_id = v_org_level_vto_id,
            updated_at = NOW()
        WHERE id = v_three_year_picture_id;
        
        RAISE NOTICE 'Successfully moved three_year_picture to org-level VTO';
    ELSE
        RAISE NOTICE 'Could not find data to move';
        RAISE NOTICE 'Org-level VTO ID: %', v_org_level_vto_id;
        RAISE NOTICE 'Team-level VTO ID: %', v_team_level_vto_id;
        RAISE NOTICE 'Three year picture ID: %', v_three_year_picture_id;
    END IF;
END $$;

-- Verify the fix
SELECT 
    'After fix:' as status,
    tp.id,
    tp.vto_id,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (Correct!)'
        ELSE 'TEAM-LEVEL (Wrong!)'
    END as vto_type,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count,
    tp.what_does_it_look_like_completions
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';