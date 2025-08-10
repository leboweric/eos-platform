-- =====================================================
-- Fix IT Team Scorecard Display by Adding Owners
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    default_owner VARCHAR;
    v_count INTEGER;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    -- Get IT Team ID
    SELECT id INTO it_team_id 
    FROM teams 
    WHERE organization_id = org_id 
      AND name = 'IT Team';
    
    RAISE NOTICE 'Found IT Team ID: %', it_team_id;
    
    -- Check current state of IT Team metrics
    SELECT COUNT(*) INTO v_count
    FROM scorecard_metrics
    WHERE team_id = it_team_id
      AND owner IS NULL;
    
    RAISE NOTICE 'Found % IT Team metrics with NULL owner', v_count;
    
    -- Set a default owner for IT Team metrics
    -- Using 'IT Team' as the default owner since we don't have specific assignments yet
    default_owner := 'IT Team';
    
    -- Update all IT Team metrics to have an owner
    UPDATE scorecard_metrics
    SET owner = default_owner
    WHERE organization_id = org_id
      AND team_id = it_team_id
      AND owner IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Updated % metrics with default owner', v_count;
    
    -- Verify the update
    SELECT COUNT(*) INTO v_count
    FROM scorecard_metrics
    WHERE team_id = it_team_id
      AND owner IS NOT NULL;
    
    RAISE NOTICE 'IT Team now has % metrics with owners', v_count;

END $$;

COMMIT;

-- =====================================================
-- Verification Query
-- =====================================================
SELECT 
    name,
    owner,
    goal,
    type,
    value_type,
    comparison_operator
FROM scorecard_metrics
WHERE team_id = (
    SELECT id FROM teams 
    WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
    AND name = 'IT Team'
)
ORDER BY name;