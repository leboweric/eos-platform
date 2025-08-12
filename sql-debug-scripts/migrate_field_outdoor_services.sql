-- Migration script for Field Outdoor Services
-- Created: 2025-08-11

BEGIN;

-- 1. Create the organization
INSERT INTO organizations (id, name, slug, subscription_tier, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Field Outdoor Services',
    'field-outdoor-services',
    'professional',
    NOW(),
    NOW()
);

-- Get the organization ID for use in subsequent inserts
DO $$
DECLARE
    v_org_id UUID;
    v_leadership_team_id UUID;
    v_user_id UUID;
BEGIN
    -- Get the organization ID we just created
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'field-outdoor-services';
    
    -- 2. Create Leadership Team (using gen_random_uuid() - NOT the special UUID!)
    INSERT INTO teams (id, organization_id, name, is_leadership_team, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Leadership Team',
        true,  -- This flag is what matters, not the UUID
        NOW(),
        NOW()
    );
    
    -- Get the leadership team ID
    SELECT id INTO v_leadership_team_id FROM teams 
    WHERE organization_id = v_org_id AND is_leadership_team = true;
    
    -- 3. Create users
    -- Password is 'Abc123!@#' (hashed)
    -- Admin user - Eric
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'eric@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Eric',
        'Admin',
        'admin',
        v_org_id,
        NOW(),
        NOW()
    );
    
    -- Add Eric to Leadership Team
    SELECT id INTO v_user_id FROM users WHERE email = 'eric@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Joey Larson
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'joe@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Joey',
        'Larson',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'joe@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Jason Rathe
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'jason@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Jason',
        'Rathe',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'jason@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Karina Greenwood
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'karina@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Karina',
        'Greenwood',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'karina@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Ann Davenport
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'ann@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Ann',
        'Davenport',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'ann@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Kenny Barko
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'kenny@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Kenny',
        'Barko',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'kenny@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- Rob Jackson
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        'rob@fieldoutdoorspaces.com',
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq',
        'Rob',
        'Jackson',
        'member',
        v_org_id,
        NOW(),
        NOW()
    );
    
    SELECT id INTO v_user_id FROM users WHERE email = 'rob@fieldoutdoorspaces.com';
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (v_user_id, v_leadership_team_id, 'member', NOW());
    
    -- 4. Create empty Business Blueprint (VTO) for the organization
    -- CRITICAL: team_id must be NULL for organization-level blueprints
    INSERT INTO business_blueprints (
        id, 
        organization_id, 
        team_id,  -- Must be NULL, not the Leadership Team ID!
        created_at, 
        updated_at
    )
    VALUES (
        gen_random_uuid(),
        v_org_id,
        NULL,  -- This is critical - must be NULL for org-level blueprints
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Successfully created Field Outdoor Services organization';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'Leadership Team ID: %', v_leadership_team_id;
    RAISE NOTICE 'Admin user: eric@fieldoutdoorspaces.com';
    RAISE NOTICE 'Password for all users: Abc123!@#';
    RAISE NOTICE '';
    RAISE NOTICE 'Users created:';
    RAISE NOTICE '  - Eric (Admin)';
    RAISE NOTICE '  - Joey Larson';
    RAISE NOTICE '  - Jason Rathe';
    RAISE NOTICE '  - Karina Greenwood';
    RAISE NOTICE '  - Ann Davenport';
    RAISE NOTICE '  - Kenny Barko';
    RAISE NOTICE '  - Rob Jackson';
    
END $$;

COMMIT;

-- Verification queries (run these after to confirm everything worked)
/*
-- Check organization
SELECT id, name, slug FROM organizations WHERE slug = 'field-outdoor-services';

-- Check Leadership Team
SELECT t.*, 
       (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
FROM teams t 
WHERE t.organization_id = (SELECT id FROM organizations WHERE slug = 'field-outdoor-services');

-- Check users
SELECT u.email, u.first_name, u.last_name, u.role, 
       EXISTS(SELECT 1 FROM team_members tm WHERE tm.user_id = u.id) as on_leadership_team
FROM users u 
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = 'field-outdoor-services')
ORDER BY u.role DESC, u.last_name;

-- Check business blueprint exists
SELECT id, organization_id, team_id 
FROM business_blueprints 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'field-outdoor-services');
*/