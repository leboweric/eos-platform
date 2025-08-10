# SQL Migration Templates

## ⚠️ CRITICAL WARNING ⚠️

**NEVER USE THE SPECIAL UUID `00000000-0000-0000-0000-000000000000` FOR LEADERSHIP TEAMS!**

Each organization MUST have its own unique Leadership Team ID. Using the special UUID will:
1. Steal it from another organization
2. Break that organization's entire system
3. Make their data inaccessible

**Always use `gen_random_uuid()` for Leadership Team IDs!**

---

## Complete Organization Setup Template

```sql
-- =====================================================
-- Complete Organization Setup Template
-- Replace placeholders marked with <PLACEHOLDER>
-- =====================================================

-- Clean up any previous attempts
ROLLBACK;

-- Delete if exists (optional - remove if keeping existing data)
DELETE FROM organizations WHERE slug = '<org-slug>';

BEGIN;

DO $$
DECLARE
    org_id UUID := gen_random_uuid();
    leadership_team_id UUID := gen_random_uuid();  -- ⚠️ NEVER use special UUID!
    password_hash VARCHAR := '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq'; -- Abc123!@#
    
    -- User IDs
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    -- Add more as needed
    
BEGIN
    -- 1. Create Organization
    INSERT INTO organizations (id, name, slug, subscription_tier, created_at, updated_at)
    VALUES (org_id, '<Organization Name>', '<org-slug>', 'professional', NOW(), NOW());

    -- 2. Create Leadership Team (NEVER use special UUID!)
    -- ⚠️ CRITICAL: Use gen_random_uuid(), NOT the special UUID!
    INSERT INTO teams (id, name, organization_id, is_leadership_team, created_at, updated_at)
    VALUES (
        gen_random_uuid(),  -- ✅ CORRECT: Unique UUID for each org
        'Leadership Team', 
        org_id, 
        true,  -- This flag is what matters
        NOW(), 
        NOW()
    );

    -- 3. Create other teams/departments
    INSERT INTO teams (name, organization_id, created_at, updated_at)
    VALUES 
        ('<Team 1>', org_id, NOW(), NOW()),
        ('<Team 2>', org_id, NOW(), NOW());
        -- Add more teams as needed

    -- 4. Create Users
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
    VALUES 
        (user1_id, '<email1@domain.com>', password_hash, '<FirstName>', '<LastName>', 'admin', org_id, NOW(), NOW()),
        (user2_id, '<email2@domain.com>', password_hash, '<FirstName>', '<LastName>', 'member', org_id, NOW(), NOW());
        -- Add more users as needed

    -- 5. Add users to Leadership Team
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES 
        (user1_id, leadership_team_id, 'member', NOW()),
        (user2_id, leadership_team_id, 'member', NOW());
        -- Add all leadership team members

    RAISE NOTICE 'Organization created successfully!';

END $$;

COMMIT;
```

## Add Business Blueprint with Core Values

```sql
-- =====================================================
-- Add Business Blueprint and Core Values
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    blueprint_id UUID;
BEGIN
    -- Get organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = '<org-slug>';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- Check if blueprint exists
    SELECT id INTO blueprint_id
    FROM business_blueprints 
    WHERE organization_id = org_id 
    AND team_id IS NULL;  -- CRITICAL: Must be NULL for org-level!
    
    IF blueprint_id IS NULL THEN
        -- Create blueprint (team_id MUST be NULL)
        INSERT INTO business_blueprints (
            organization_id,
            team_id,  -- This will be NULL
            name,
            is_shared_with_all_teams,
            created_at,
            updated_at
        ) VALUES (
            org_id,
            NULL,  -- CRITICAL: NULL for organization-level
            'Business Blueprint',
            true,
            NOW(),
            NOW()
        ) RETURNING id INTO blueprint_id;
    END IF;
    
    -- Delete existing core values (for re-runs)
    DELETE FROM core_values WHERE vto_id = blueprint_id;
    
    -- Insert Core Values
    INSERT INTO core_values (vto_id, value_text, description, sort_order, created_at, updated_at)
    VALUES 
        (blueprint_id, '<Core Value 1>', '<Description 1>', 1, NOW(), NOW()),
        (blueprint_id, '<Core Value 2>', '<Description 2>', 2, NOW(), NOW()),
        (blueprint_id, '<Core Value 3>', '<Description 3>', 3, NOW(), NOW());
    
    RAISE NOTICE 'Core Values added successfully!';

END $$;

COMMIT;
```

## Add Quarterly Priorities (Rocks)

```sql
-- =====================================================
-- Add Quarterly Priorities/Rocks
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    user_id UUID;
    current_quarter INTEGER := EXTRACT(QUARTER FROM CURRENT_DATE);
    current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    -- Get organization
    SELECT id INTO org_id FROM organizations WHERE slug = '<org-slug>';
    
    -- Get user for ownership
    SELECT id INTO user_id FROM users 
    WHERE organization_id = org_id 
    AND email = '<owner-email@domain.com>';
    
    -- Insert Company Priority
    INSERT INTO quarterly_priorities (
        organization_id,
        team_id,
        title,
        description,
        owner_id,
        quarter,
        year,
        status,
        priority_type,
        created_at,
        updated_at
    ) VALUES (
        org_id,
        leadership_team_id,  -- Use the generated UUID for this org's Leadership Team
        '<Priority Title>',
        '<Priority Description>',
        user_id,
        current_quarter,
        current_year,
        'on-track',
        'company',  -- or 'individual'
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Quarterly priorities added!';

END $$;

COMMIT;
```

## Add Scorecard Metrics

```sql
-- =====================================================
-- Add Scorecard Metrics
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    owner_id UUID;
    team_id UUID;
BEGIN
    -- Get organization
    SELECT id INTO org_id FROM organizations WHERE slug = '<org-slug>';
    
    -- Get owner
    SELECT id INTO owner_id FROM users 
    WHERE organization_id = org_id 
    AND email = '<owner-email@domain.com>';
    
    -- Get team (use Leadership Team or specific team)
    -- Get the Leadership Team ID for this org (NOT the special UUID!)
    SELECT id INTO team_id FROM teams 
    WHERE organization_id = org_id AND is_leadership_team = true;
    
    -- Insert metrics
    INSERT INTO scorecard_metrics (
        name,
        description,
        target_value,
        target_operator,
        frequency,
        metric_type,
        owner_id,
        organization_id,
        team_id,
        display_order,
        created_at,
        updated_at
    ) VALUES 
        ('<Metric Name>', '<Description>', '100', '>=', 'weekly', 'number', 
         owner_id, org_id, team_id, 1, NOW(), NOW()),
        ('<Metric Name 2>', '<Description>', '95', '>=', 'weekly', 'percentage', 
         owner_id, org_id, team_id, 2, NOW(), NOW());
    
    RAISE NOTICE 'Scorecard metrics added!';

END $$;

COMMIT;
```

## Troubleshooting Queries

```sql
-- =====================================================
-- Diagnostic Queries
-- =====================================================

-- Check organization and teams
SELECT 
    o.id as org_id,
    o.name as org_name,
    o.slug,
    t.id as team_id,
    t.name as team_name,
    t.is_leadership_team
FROM organizations o
LEFT JOIN teams t ON t.organization_id = o.id
WHERE o.slug = '<org-slug>'
ORDER BY t.is_leadership_team DESC, t.name;

-- Check business blueprint setup
SELECT 
    bb.id,
    bb.team_id,
    bb.name,
    COUNT(cv.id) as core_values_count
FROM business_blueprints bb
LEFT JOIN core_values cv ON cv.vto_id = bb.id
WHERE bb.organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
GROUP BY bb.id, bb.team_id, bb.name;

-- Check users and team assignments
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    u.role as user_role,
    t.name as team_name,
    tm.role as team_role
FROM users u
LEFT JOIN team_members tm ON u.id = tm.user_id
LEFT JOIN teams t ON tm.team_id = t.id
WHERE u.organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
ORDER BY u.email;

-- Fix duplicate blueprints
DELETE FROM business_blueprints 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
AND id NOT IN (
    SELECT bb.id 
    FROM business_blueprints bb
    LEFT JOIN core_values cv ON cv.vto_id = bb.id
    WHERE bb.organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
    GROUP BY bb.id
    ORDER BY COUNT(cv.id) DESC
    LIMIT 1
);
```

## Quick Fixes

```sql
-- Fix Leadership Team flag
UPDATE teams 
SET is_leadership_team = true 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
AND name = 'Leadership Team';  -- Find by name, not by special UUID

-- Fix Business Blueprint team_id
UPDATE business_blueprints 
SET team_id = NULL 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>');

-- Clean up duplicate empty blueprints
DELETE FROM business_blueprints 
WHERE organization_id = (SELECT id FROM organizations WHERE slug = '<org-slug>')
AND NOT EXISTS (
    SELECT 1 FROM core_values WHERE vto_id = business_blueprints.id
);
```

## Notes

1. Always use `team_id = NULL` for organization-level business blueprints
2. ⚠️ NEVER use the special UUID `'00000000-0000-0000-0000-000000000000'` - each org needs its own
3. Password hash `$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq` = 'Abc123!@#'
4. Run diagnostic queries after setup to verify everything is correct
5. Always start with `ROLLBACK;` to clear any failed transactions