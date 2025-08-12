-- Check the schema first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'three_year_pictures'
ORDER BY ordinal_position;

-- Simpler migration script - just copy the essential data
DO $$
DECLARE
    v_org_level_vto_id UUID;
    v_team_level_vto_id UUID;
    v_original_data jsonb;
    v_original_completions jsonb;
    v_original_future_date date;
BEGIN
    -- Get the VTO IDs
    SELECT id INTO v_org_level_vto_id
    FROM business_blueprints
    WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
      AND team_id IS NULL;
    
    SELECT id INTO v_team_level_vto_id
    FROM business_blueprints
    WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
      AND team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626';
    
    -- Get the original data from team-level (only fields that exist)
    SELECT 
        what_does_it_look_like,
        what_does_it_look_like_completions,
        future_date
    INTO 
        v_original_data,
        v_original_completions,
        v_original_future_date
    FROM three_year_pictures
    WHERE vto_id = v_team_level_vto_id;
    
    IF v_original_data IS NOT NULL AND jsonb_array_length(v_original_data) > 0 THEN
        RAISE NOTICE 'Found original data with % items', jsonb_array_length(v_original_data);
        
        -- Update the org-level three_year_picture with the original data
        UPDATE three_year_pictures
        SET 
            what_does_it_look_like = v_original_data,
            what_does_it_look_like_completions = COALESCE(v_original_completions, '{}'::jsonb),
            future_date = COALESCE(future_date, v_original_future_date),
            updated_at = NOW()
        WHERE vto_id = v_org_level_vto_id;
        
        RAISE NOTICE 'Successfully migrated data to org-level VTO';
    ELSE
        RAISE NOTICE 'No original data found to migrate';
    END IF;
END $$;

-- Verify the migration
SELECT 
    'After migration:' as status,
    tp.id,
    tp.vto_id,
    tp.future_date,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL;

-- Show the migrated items as a list
SELECT 
    ordinality as item_number,
    value as item_text
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id,
LATERAL jsonb_array_elements_text(tp.what_does_it_look_like::jsonb) WITH ORDINALITY
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL
ORDER BY ordinality;