-- Check Field Outdoor Spaces organization and business blueprint status

-- First, find the organization
SELECT id, name, slug 
FROM organizations 
WHERE name LIKE '%Field Outdoor%';

-- Check if they have a leadership team
SELECT t.id, t.name, t.is_leadership_team, t.organization_id
FROM teams t
JOIN organizations o ON o.id = t.organization_id
WHERE o.name LIKE '%Field Outdoor%'
  AND t.is_leadership_team = true;

-- Check their business blueprints
SELECT bb.id, bb.organization_id, bb.team_id, bb.created_at,
       o.name as org_name,
       t.name as team_name
FROM business_blueprints bb
JOIN organizations o ON o.id = bb.organization_id
LEFT JOIN teams t ON t.id = bb.team_id
WHERE o.name LIKE '%Field Outdoor%';

-- Check if they have a three_year_picture
SELECT tp.*, bb.team_id
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
JOIN organizations o ON o.id = bb.organization_id
WHERE o.name LIKE '%Field Outdoor%';

-- FIX: If Field Outdoor Spaces has a business_blueprint with a team_id 
-- but it should be NULL for the leadership team, run this:

-- First, verify the issue exists
DO $$
DECLARE
    v_org_id UUID;
    v_leadership_team_id UUID;
    v_has_org_level_vto BOOLEAN;
    v_has_team_level_vto BOOLEAN;
BEGIN
    -- Get Field Outdoor Spaces org ID
    SELECT id INTO v_org_id
    FROM organizations 
    WHERE name = 'Field Outdoor Spaces';
    
    -- Get their leadership team ID
    SELECT id INTO v_leadership_team_id
    FROM teams
    WHERE organization_id = v_org_id
      AND is_leadership_team = true
    LIMIT 1;
    
    -- Check if they have an org-level VTO (team_id IS NULL)
    SELECT EXISTS(
        SELECT 1 FROM business_blueprints 
        WHERE organization_id = v_org_id 
        AND team_id IS NULL
    ) INTO v_has_org_level_vto;
    
    -- Check if they have a team-level VTO for leadership team
    SELECT EXISTS(
        SELECT 1 FROM business_blueprints 
        WHERE organization_id = v_org_id 
        AND team_id = v_leadership_team_id
    ) INTO v_has_team_level_vto;
    
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'Leadership Team ID: %', v_leadership_team_id;
    RAISE NOTICE 'Has org-level VTO (team_id IS NULL): %', v_has_org_level_vto;
    RAISE NOTICE 'Has team-level VTO: %', v_has_team_level_vto;
    
    -- If they have a team-level VTO but no org-level VTO, fix it
    IF v_has_team_level_vto AND NOT v_has_org_level_vto THEN
        RAISE NOTICE 'Fixing: Converting team-level VTO to org-level VTO';
        
        UPDATE business_blueprints
        SET team_id = NULL,
            updated_at = NOW()
        WHERE organization_id = v_org_id
          AND team_id = v_leadership_team_id;
          
        RAISE NOTICE 'Fixed! Leadership team VTO converted to org-level VTO';
    ELSIF NOT v_has_org_level_vto AND NOT v_has_team_level_vto THEN
        RAISE NOTICE 'No VTO exists for this organization - needs to be created';
    ELSIF v_has_org_level_vto THEN
        RAISE NOTICE 'Organization already has correct org-level VTO - no fix needed';
    END IF;
END $$;