-- Migration to support department-level 3-Year Picture and 1-Year Plan
-- While keeping Core Values, Focus, BHAG, and Marketing Strategy at organization level

-- First, ensure business_blueprints table has team_id column (it should already exist)
-- The team_id IS NULL means organization-level blueprint
-- The team_id NOT NULL means department-level blueprint

-- Add a comment to clarify the structure
COMMENT ON COLUMN business_blueprints.team_id IS 
'NULL for organization-level blueprint (contains core values, focus, BHAG, marketing strategy). 
NOT NULL for department-level blueprint (contains department-specific 3-year picture and 1-year plan)';

-- Create an index for better performance when querying department blueprints
CREATE INDEX IF NOT EXISTS idx_business_blueprints_team_id 
ON business_blueprints(organization_id, team_id);

-- Function to ensure department blueprint exists and inherits from org blueprint
CREATE OR REPLACE FUNCTION ensure_department_blueprint(
    p_org_id UUID,
    p_team_id UUID
) RETURNS UUID AS $$
DECLARE
    v_blueprint_id UUID;
    v_org_blueprint_id UUID;
BEGIN
    -- Check if department blueprint exists
    SELECT id INTO v_blueprint_id
    FROM business_blueprints
    WHERE organization_id = p_org_id 
    AND team_id = p_team_id;
    
    IF v_blueprint_id IS NULL THEN
        -- Get org-level blueprint ID (for potential future reference linking)
        SELECT id INTO v_org_blueprint_id
        FROM business_blueprints
        WHERE organization_id = p_org_id 
        AND team_id IS NULL;
        
        -- Create department blueprint
        v_blueprint_id := gen_random_uuid();
        INSERT INTO business_blueprints (id, organization_id, team_id)
        VALUES (v_blueprint_id, p_org_id, p_team_id);
    END IF;
    
    RETURN v_blueprint_id;
END;
$$ LANGUAGE plpgsql;

-- Add a view to make it easier to get complete department blueprint data
-- This view combines org-level shared data with department-specific data
CREATE OR REPLACE VIEW complete_department_blueprints AS
SELECT 
    db.id as department_blueprint_id,
    db.organization_id,
    db.team_id,
    t.name as team_name,
    ob.id as org_blueprint_id,
    -- Org-level shared components (from org blueprint)
    cv.id as core_values_id,
    cf.id as core_focus_id,
    tyt.id as ten_year_target_id,
    ms.id as marketing_strategy_id,
    -- Department-specific components (from department blueprint)
    dtyp.id as dept_three_year_picture_id,
    doyp.id as dept_one_year_plan_id
FROM business_blueprints db
JOIN teams t ON t.id = db.team_id
JOIN business_blueprints ob ON ob.organization_id = db.organization_id AND ob.team_id IS NULL
LEFT JOIN core_values cv ON cv.vto_id = ob.id
LEFT JOIN core_focus cf ON cf.vto_id = ob.id
LEFT JOIN ten_year_targets tyt ON tyt.vto_id = ob.id
LEFT JOIN marketing_strategies ms ON ms.vto_id = ob.id
LEFT JOIN three_year_pictures dtyp ON dtyp.vto_id = db.id
LEFT JOIN one_year_plans doyp ON doyp.vto_id = db.id
WHERE db.team_id IS NOT NULL;

-- Add comments to clarify the architecture
COMMENT ON VIEW complete_department_blueprints IS 
'Combines organization-level shared components (Core Values, Focus, BHAG, Marketing) 
with department-specific components (3-Year Picture, 1-Year Plan)';