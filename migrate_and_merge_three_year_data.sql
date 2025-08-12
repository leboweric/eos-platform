-- Migrate and merge the original 3-year picture data for Field Outdoor Spaces

-- First, let's see what we have
SELECT 
    'Current state:' as status,
    tp.id,
    tp.vto_id,
    bb.team_id,
    CASE 
        WHEN bb.team_id IS NULL THEN 'ORG-LEVEL (current/new)'
        WHEN bb.team_id = 'c7b489a1-5bf4-48a5-a51d-6e5e76f8f626' THEN 'TEAM-LEVEL (original data)'
    END as vto_type,
    tp.what_does_it_look_like
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492';

-- Merge the original data from team-level VTO into the org-level VTO
DO $$
DECLARE
    v_org_level_vto_id UUID;
    v_team_level_vto_id UUID;
    v_original_data jsonb;
    v_original_completions jsonb;
    v_original_future_date date;
    v_original_revenue decimal;
    v_original_profit decimal;
    v_original_measurables jsonb;
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
    
    -- Get the original data from team-level
    SELECT 
        what_does_it_look_like,
        what_does_it_look_like_completions,
        future_date,
        revenue,
        profit,
        measurables
    INTO 
        v_original_data,
        v_original_completions,
        v_original_future_date,
        v_original_revenue,
        v_original_profit,
        v_original_measurables
    FROM three_year_pictures
    WHERE vto_id = v_team_level_vto_id;
    
    IF v_original_data IS NOT NULL AND jsonb_array_length(v_original_data) > 0 THEN
        RAISE NOTICE 'Found original data with % items', jsonb_array_length(v_original_data);
        
        -- Update the org-level three_year_picture with the original data
        UPDATE three_year_pictures
        SET 
            what_does_it_look_like = COALESCE(
                CASE 
                    WHEN what_does_it_look_like IS NULL OR jsonb_array_length(what_does_it_look_like::jsonb) = 0 
                    THEN v_original_data
                    ELSE what_does_it_look_like::jsonb || v_original_data  -- Merge if there's already new data
                END,
                v_original_data
            ),
            what_does_it_look_like_completions = COALESCE(v_original_completions, '{}'::jsonb),
            future_date = COALESCE(future_date, v_original_future_date),
            revenue = COALESCE(revenue, v_original_revenue),
            profit = COALESCE(profit, v_original_profit),
            measurables = COALESCE(measurables, v_original_measurables),
            updated_at = NOW()
        WHERE vto_id = v_org_level_vto_id;
        
        RAISE NOTICE 'Successfully migrated data to org-level VTO';
        
        -- Optional: Delete the team-level three_year_picture to avoid confusion
        -- DELETE FROM three_year_pictures WHERE vto_id = v_team_level_vto_id;
        -- RAISE NOTICE 'Removed duplicate team-level three_year_picture';
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
    tp.revenue,
    tp.profit,
    jsonb_array_length(tp.what_does_it_look_like::jsonb) as item_count,
    tp.what_does_it_look_like
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL;

-- Show the items as a list
SELECT 
    'Migrated items:' as status,
    jsonb_array_elements_text(tp.what_does_it_look_like::jsonb) as item
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL;