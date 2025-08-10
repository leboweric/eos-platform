-- =====================================================
-- Fix IT Team Individual Metrics - Handle Duplicates
-- =====================================================

-- First, let's see what we actually have
SELECT 
    sm.id,
    sm.name,
    sm.goal,
    sm.comparison_operator,
    sm.owner
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
  AND sm.name LIKE 'Individual%'
ORDER BY sm.name, sm.goal;

-- Update the duplicate metrics to have unique names based on their goals
BEGIN;

DO $$
DECLARE
    org_id UUID;
    it_team_id UUID;
    v_metric_id_10 UUID;
    v_metric_id_8 UUID;
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
    
    -- Find the two "Individual - Helpdesk Hours" metrics
    -- One with goal <= 10
    SELECT id INTO v_metric_id_10
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Individual - Helpdesk Hours '  -- Note the space at the end
      AND goal = 10;
    
    -- One with goal >= 10 (or goal = 8)
    SELECT id INTO v_metric_id_8
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = it_team_id 
      AND name = 'Individual - Helpdesk Hours '  -- Note the space at the end
      AND goal != 10;
    
    -- Update the names to be unique
    IF v_metric_id_10 IS NOT NULL THEN
        UPDATE scorecard_metrics 
        SET name = 'Individual - Helpdesk Hours (Target: 10)'
        WHERE id = v_metric_id_10;
        RAISE NOTICE 'Updated metric % to "Individual - Helpdesk Hours (Target: 10)"', v_metric_id_10;
    END IF;
    
    IF v_metric_id_8 IS NOT NULL THEN
        UPDATE scorecard_metrics 
        SET name = 'Individual - Helpdesk Hours (Target: 8)',
            goal = 8  -- Make sure the goal is 8
        WHERE id = v_metric_id_8;
        RAISE NOTICE 'Updated metric % to "Individual - Helpdesk Hours (Target: 8)"', v_metric_id_8;
    END IF;
    
    -- Also clean up any trailing spaces in other metric names
    UPDATE scorecard_metrics
    SET name = TRIM(name)
    WHERE organization_id = org_id 
      AND team_id = it_team_id
      AND name != TRIM(name);

END $$;

COMMIT;

-- Verify the changes
SELECT 
    sm.id,
    sm.name,
    sm.goal,
    sm.comparison_operator,
    sm.owner
FROM scorecard_metrics sm
JOIN teams t ON sm.team_id = t.id
JOIN organizations o ON sm.organization_id = o.id
WHERE o.slug = 'boyum-barenscheer'
  AND t.name = 'IT Team'
ORDER BY sm.name;