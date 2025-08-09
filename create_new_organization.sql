-- =====================================================
-- Create New Organization Script
-- =====================================================
-- This script creates a new organization with all necessary related data
-- Replace the placeholder values with your actual data

BEGIN;

-- 1. Create the Organization
INSERT INTO organizations (
    id,
    name,
    industry,
    employee_count,
    annual_revenue,
    created_at,
    updated_at,
    subscription_status,
    subscription_plan,
    subscription_end_date,
    trial_ends_at
) VALUES (
    gen_random_uuid(), -- Or specify a specific UUID like 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid
    'Your Company Name', -- CHANGE THIS
    'Technology', -- CHANGE THIS (optional)
    50, -- CHANGE THIS (optional)
    5000000, -- CHANGE THIS (optional, annual revenue)
    NOW(),
    NOW(),
    'active', -- or 'trial' if you want trial period
    'professional', -- or 'basic', 'enterprise'
    NOW() + INTERVAL '1 year', -- subscription end date
    NOW() + INTERVAL '14 days' -- trial end date (if applicable)
);

-- Get the organization ID we just created (for use in subsequent inserts)
-- If you specified a UUID above, use that instead
DO $$
DECLARE
    org_id UUID;
    admin_user_id UUID;
    leadership_team_id UUID;
BEGIN
    -- Get the organization we just created
    SELECT id INTO org_id FROM organizations 
    WHERE name = 'Your Company Name' -- CHANGE THIS to match above
    ORDER BY created_at DESC 
    LIMIT 1;

    -- 2. Create the Leadership Team (special team with UUID of all zeros)
    leadership_team_id := '00000000-0000-0000-0000-000000000000'::uuid;
    
    INSERT INTO teams (
        id,
        name,
        organization_id,
        is_leadership_team,
        created_at,
        updated_at
    ) VALUES (
        leadership_team_id,
        'Leadership Team',
        org_id,
        true,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO UPDATE 
    SET organization_id = org_id,
        is_leadership_team = true;

    -- 3. Create Admin User
    admin_user_id := gen_random_uuid();
    
    INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        organization_id,
        team_id,
        created_at,
        updated_at,
        is_active,
        requires_password_change
    ) VALUES (
        admin_user_id,
        'admin@yourcompany.com', -- CHANGE THIS
        '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', -- Default password: Abc123!@#
        'Admin', -- CHANGE THIS
        'User', -- CHANGE THIS
        'admin',
        org_id,
        leadership_team_id,
        NOW(),
        NOW(),
        true,
        true -- Force password change on first login
    );

    -- 4. Add admin to team_members table
    INSERT INTO team_members (
        id,
        user_id,
        team_id,
        role,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        admin_user_id,
        leadership_team_id,
        'member',
        NOW(),
        NOW()
    );

    -- 5. Create additional departments/teams (optional)
    -- Uncomment and modify as needed
    /*
    INSERT INTO teams (id, name, organization_id, is_leadership_team, created_at, updated_at)
    VALUES 
        (gen_random_uuid(), 'Sales', org_id, false, NOW(), NOW()),
        (gen_random_uuid(), 'Marketing', org_id, false, NOW(), NOW()),
        (gen_random_uuid(), 'Operations', org_id, false, NOW(), NOW()),
        (gen_random_uuid(), 'Finance', org_id, false, NOW(), NOW());
    */

    -- 6. Initialize VTO (Vision/Traction Organizer) for the organization
    INSERT INTO vision_traction_organizer (
        id,
        organization_id,
        ten_year_target,
        three_year_picture,
        one_year_plan,
        core_values,
        core_focus,
        marketing_strategy,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        NULL, -- Will be filled in later
        NULL,
        NULL,
        '[]'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW()
    );

    -- 7. Create initial subscription record
    INSERT INTO subscriptions (
        id,
        organization_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        plan,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        org_id,
        NULL, -- Will be set when they add payment method
        NULL, -- Will be set when they subscribe
        'trialing', -- or 'active' if paid
        'professional',
        NOW(),
        NOW() + INTERVAL '14 days', -- 14-day trial
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Organization created successfully!';
    RAISE NOTICE 'Organization ID: %', org_id;
    RAISE NOTICE 'Admin User ID: %', admin_user_id;
    RAISE NOTICE 'Admin Email: admin@yourcompany.com';
    RAISE NOTICE 'Default Password: Abc123!@#';
    RAISE NOTICE 'Remember to change the password on first login!';

END $$;

COMMIT;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. CHANGE all placeholder values marked with "CHANGE THIS"
-- 2. Default admin password is: Abc123!@#
-- 3. Admin will be prompted to change password on first login
-- 4. Organization starts with a 14-day trial by default
-- 5. Only Leadership Team is created by default
-- 6. Uncomment additional teams section if needed
-- =====================================================

-- To run this script:
-- psql -h your-database-host -U your-username -d your-database-name -f create_new_organization.sql