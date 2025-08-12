-- Create Sentient Wealth Organization and Super User
-- Run this script in pgAdmin

-- Create the organization
INSERT INTO organizations (name, slug, created_at, updated_at)
VALUES ('Sentient Wealth', 'sentient-wealth', NOW(), NOW());

-- Get the organization ID
DO $$
DECLARE
    org_id UUID;
    user_id UUID;
BEGIN
    -- Get the organization ID we just created
    SELECT id INTO org_id FROM organizations WHERE name = 'Sentient Wealth' LIMIT 1;
    
    -- Create a super user for Sentient Wealth
    -- Email: admin@sentientwealth.com
    -- Password: TestPassword123!
    INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        organization_id, 
        role,
        created_at, 
        updated_at
    )
    VALUES (
        'admin@sentientwealth.com',
        -- This is a bcrypt hash of 'TestPassword123!'
        '$2a$12$wU2wFN1AXdd4X7wSb6IqNe0lXpiz.D8I9eoUVrPSs.OxLqRW/oqn6',
        'Sentient',
        'Admin',
        org_id,
        'admin',
        NOW(),
        NOW()
    )
    RETURNING id INTO user_id;
    
    RAISE NOTICE 'Organization created with ID: %', org_id;
    RAISE NOTICE 'Super user created with ID: %', user_id;
END $$;

-- Verify the creation
SELECT o.id as org_id, o.name as org_name, 
       u.id as user_id, u.email, u.role
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE o.name = 'Sentient Wealth';