-- First, let's check if the consultant_organizations table exists
-- If not, we need to create it

-- Create consultant_organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS consultant_organizations (
    id SERIAL PRIMARY KEY,
    consultant_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(consultant_user_id, organization_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_consultant_organizations_consultant ON consultant_organizations(consultant_user_id);
CREATE INDEX IF NOT EXISTS idx_consultant_organizations_org ON consultant_organizations(organization_id);

-- Get the consultant user ID
DO $$
DECLARE
    v_consultant_id UUID;
    v_org_id UUID;
BEGIN
    -- Get consultant user ID
    SELECT id INTO v_consultant_id
    FROM users
    WHERE email = 'elebow@eosworldwide.com'
    LIMIT 1;
    
    IF v_consultant_id IS NULL THEN
        RAISE NOTICE 'Consultant user not found';
        RETURN;
    END IF;
    
    -- Make sure the user is marked as consultant
    UPDATE users 
    SET is_consultant = TRUE,
        consultant_email = 'elebow@eosworldwide.com'
    WHERE id = v_consultant_id;
    
    RAISE NOTICE 'Consultant user ID: %', v_consultant_id;
    
    -- Re-establish consultant relationships for all organizations except the consultant's own
    FOR v_org_id IN 
        SELECT DISTINCT o.id 
        FROM organizations o
        WHERE o.id != (SELECT organization_id FROM users WHERE id = v_consultant_id)
        ORDER BY o.id
    LOOP
        INSERT INTO consultant_organizations (consultant_user_id, organization_id)
        VALUES (v_consultant_id, v_org_id)
        ON CONFLICT (consultant_user_id, organization_id) DO NOTHING;
        
        RAISE NOTICE 'Added consultant access to org: %', v_org_id;
    END LOOP;
END $$;

-- Verify the consultant relationships
SELECT 
    co.consultant_user_id,
    u.email as consultant_email,
    co.organization_id,
    o.name as organization_name,
    o.created_at
FROM consultant_organizations co
JOIN users u ON co.consultant_user_id = u.id
JOIN organizations o ON co.organization_id = o.id
ORDER BY o.name;