-- =====================================================
-- Fix Bennett's Scorecard Groups
-- Move them from special UUID to Bennett's new Leadership Team
-- =====================================================

BEGIN;

DO $$
DECLARE
    bennett_org_id UUID;
    bennett_new_leadership_id UUID;
    special_uuid UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- Get Bennett's organization ID
    SELECT id INTO bennett_org_id 
    FROM organizations 
    WHERE slug = 'bennett-material-handling';
    
    -- Get Bennett's new Leadership Team ID
    SELECT id INTO bennett_new_leadership_id 
    FROM teams 
    WHERE organization_id = bennett_org_id 
    AND is_leadership_team = true
    AND id != special_uuid;
    
    IF bennett_new_leadership_id IS NULL THEN
        RAISE EXCEPTION 'Bennett new Leadership Team not found!';
    END IF;
    
    RAISE NOTICE 'Moving Bennett scorecard groups from % to %', special_uuid, bennett_new_leadership_id;
    
    -- Move Bennett's scorecard groups to the new Leadership Team
    UPDATE scorecard_groups
    SET team_id = bennett_new_leadership_id
    WHERE organization_id = bennett_org_id
    AND team_id = special_uuid;
    
    RAISE NOTICE 'Moved % scorecard groups', FOUND;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bennett Scorecard Groups Fixed!';
    RAISE NOTICE '========================================';

END $$;

COMMIT;

-- Verify the fix
SELECT 
    'VERIFICATION - Bennett Groups' as check,
    sg.id,
    sg.name,
    sg.team_id,
    t.name as team_name,
    sg.type,
    sg.display_order
FROM scorecard_groups sg
JOIN teams t ON sg.team_id = t.id
WHERE sg.organization_id = (SELECT id FROM organizations WHERE slug = 'bennett-material-handling')
ORDER BY sg.display_order;