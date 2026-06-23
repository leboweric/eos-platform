-- =====================================================
-- Boyum Barenscheer: Remove inactive users + add Mark Keating
-- Organization slug: boyum-barenscheer
-- Organization ID:  ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e
-- =====================================================
-- Run in pgAdmin on the railway database.
--
-- WHY mark@kandeconsulting.com fails in the UI:
--   Emails are globally unique across ALL tenants. Mark already exists
--   in the separate "K&E Consulting" tenant (kande-consulting), so the
--   Boyum admin UI correctly blocks a duplicate — he is not in Boyum yet.
--
-- This script:
--   1) Shows diagnostics (run STEP 1 first)
--   2) Removes requested inactive Boyum users
--   3) Transfers Mark Keating from K&E Consulting → Boyum IT Team
-- =====================================================

-- =====================================================
-- STEP 1: DIAGNOSTICS (run this section first, review output)
-- =====================================================

-- Boyum org check
SELECT id, name, slug FROM organizations
WHERE slug = 'boyum-barenscheer' OR id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';

-- Users to remove (Boyum tenant)
SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, o.name AS org_name
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND (
    (u.first_name ILIKE 'Anthony' AND u.last_name ILIKE 'Roche')
    OR (u.first_name ILIKE 'Elizabeth' AND u.last_name ILIKE 'Wilcox')
    OR (u.first_name ILIKE 'Isabel' AND (u.last_name ILIKE 'Christianson' OR u.last_name ILIKE 'Wollermann'))
    OR (u.first_name ILIKE 'Katy' AND u.last_name ILIKE 'Schultz')
    OR (u.first_name ILIKE 'Travis' AND u.last_name ILIKE 'Noe')
  )
ORDER BY u.last_name, u.first_name;

-- Mark Keating — where does this email live today?
SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, o.name AS org_name, o.slug
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'mark@kandeconsulting.com';

-- Boyum IT team
SELECT id, name, is_leadership_team
FROM teams
WHERE organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND name ILIKE '%IT%'
ORDER BY name;


-- =====================================================
-- STEP 2: REMOVE INACTIVE BOYUM USERS
-- =====================================================
-- Review STEP 1 output before running this block.

BEGIN;

DO $$
DECLARE
    boyum_org_id UUID := 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
    fallback_admin_id UUID;
    target_user RECORD;
    removed_count INT := 0;
BEGIN
    -- Reassign owned records to an active Boyum admin before delete
    SELECT u.id INTO fallback_admin_id
    FROM users u
    WHERE u.organization_id = boyum_org_id
      AND u.role = 'admin'
      AND COALESCE(u.is_active, true) = true
      AND u.email = 'thaag@myboyum.com'
    LIMIT 1;

    IF fallback_admin_id IS NULL THEN
        SELECT u.id INTO fallback_admin_id
        FROM users u
        WHERE u.organization_id = boyum_org_id
          AND u.role = 'admin'
          AND COALESCE(u.is_active, true) = true
        ORDER BY u.created_at
        LIMIT 1;
    END IF;

    IF fallback_admin_id IS NULL THEN
        RAISE EXCEPTION 'No active Boyum admin found for ownership reassignment';
    END IF;

    FOR target_user IN
        SELECT u.id, u.email, u.first_name, u.last_name, u.role
        FROM users u
        WHERE u.organization_id = boyum_org_id
          AND u.id <> fallback_admin_id
          AND (
            (u.first_name ILIKE 'Anthony' AND u.last_name ILIKE 'Roche')
            OR (u.first_name ILIKE 'Elizabeth' AND u.last_name ILIKE 'Wilcox')
            OR (u.first_name ILIKE 'Isabel' AND (u.last_name ILIKE 'Christianson' OR u.last_name ILIKE 'Wollermann'))
            OR (u.first_name ILIKE 'Katy' AND u.last_name ILIKE 'Schultz')
            OR (u.first_name ILIKE 'Travis' AND u.last_name ILIKE 'Noe')
          )
    LOOP
        RAISE NOTICE 'Removing: % % (%) role=%', target_user.first_name, target_user.last_name, target_user.email, target_user.role;

        -- Reassign references that block deletion
        UPDATE issues SET owner_id = fallback_admin_id WHERE owner_id = target_user.id;
        UPDATE issues SET created_by_id = fallback_admin_id WHERE created_by_id = target_user.id;
        UPDATE todos SET assigned_to_id = fallback_admin_id WHERE assigned_to_id = target_user.id;
        UPDATE todos SET created_by_id = fallback_admin_id WHERE created_by_id = target_user.id;
        UPDATE todos SET owner_id = fallback_admin_id WHERE owner_id = target_user.id;
        UPDATE quarterly_priorities SET owner_id = fallback_admin_id WHERE owner_id = target_user.id;
        UPDATE priority_milestones SET owner_id = fallback_admin_id WHERE owner_id = target_user.id;
        UPDATE scorecard_metrics SET owner = (
            SELECT first_name || ' ' || last_name FROM users WHERE id = fallback_admin_id
        ) WHERE owner IN (
            SELECT first_name || ' ' || last_name FROM users WHERE id = target_user.id
        );

        -- team_members cascades on user delete; invitations may reference email only
        DELETE FROM invitations WHERE email = target_user.email AND organization_id = boyum_org_id;

        DELETE FROM users WHERE id = target_user.id AND organization_id = boyum_org_id;
        removed_count := removed_count + 1;
    END LOOP;

    IF removed_count = 0 THEN
        RAISE WARNING 'No matching Boyum users found to remove — check STEP 1 diagnostics';
    ELSE
        RAISE NOTICE 'Removed % user(s) from Boyum Barenscheer', removed_count;
    END IF;

    -- Refresh subscription user count
    UPDATE subscriptions s
    SET user_count = (
        SELECT COUNT(*) FROM users u WHERE u.organization_id = boyum_org_id AND COALESCE(u.is_active, true) = true
    ),
    updated_at = NOW()
    WHERE s.organization_id = boyum_org_id;
END $$;

COMMIT;


-- =====================================================
-- STEP 3: TRANSFER Mark Keating → Boyum IT Team
-- =====================================================
-- Removes him from K&E Consulting tenant and places him in Boyum IT.
-- After this, he will NOT appear in K&E Consulting's user list.

BEGIN;

DO $$
DECLARE
    boyum_org_id UUID := 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e';
    it_team_id UUID;
    mark_user_id UUID;
    mark_old_org_id UUID;
    kande_org_id UUID;
    temp_password_hash TEXT := '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq'; -- Abc123!@#
BEGIN
    SELECT id INTO it_team_id
    FROM teams
    WHERE organization_id = boyum_org_id
      AND name = 'IT Team'
    LIMIT 1;

    IF it_team_id IS NULL THEN
        RAISE EXCEPTION 'Boyum IT Team not found — check team name in STEP 1';
    END IF;

    SELECT u.id, u.organization_id INTO mark_user_id, mark_old_org_id
    FROM users u
    WHERE u.email = 'mark@kandeconsulting.com';

    IF mark_user_id IS NULL THEN
        -- Email is free: create Mark directly in Boyum
        INSERT INTO users (
            id, organization_id, email, password_hash,
            first_name, last_name, role,
            is_active, is_temporary_password, created_at, updated_at
        )
        VALUES (
            gen_random_uuid(), boyum_org_id, 'mark@kandeconsulting.com', temp_password_hash,
            'Mark', 'Keating', 'member',
            true, true, NOW(), NOW()
        )
        RETURNING id INTO mark_user_id;

        RAISE NOTICE 'Created new Mark Keating user in Boyum: %', mark_user_id;
    ELSE
        IF mark_old_org_id = boyum_org_id THEN
            RAISE NOTICE 'Mark already belongs to Boyum — updating team assignment only';
        ELSE
            SELECT id INTO kande_org_id FROM organizations WHERE slug = 'kande-consulting' LIMIT 1;

            RAISE NOTICE 'Transferring Mark from org % to Boyum', mark_old_org_id;

            UPDATE users
            SET organization_id = boyum_org_id,
                role = 'member',
                is_active = true,
                updated_at = NOW()
            WHERE id = mark_user_id;

            -- Refresh K&E subscription count if that org exists
            IF kande_org_id IS NOT NULL THEN
                UPDATE subscriptions s
                SET user_count = (
                    SELECT COUNT(*) FROM users u
                    WHERE u.organization_id = kande_org_id AND COALESCE(u.is_active, true) = true
                ),
                updated_at = NOW()
                WHERE s.organization_id = kande_org_id;
            END IF;
        END IF;
    END IF;

    -- Replace team memberships with Boyum IT only
    DELETE FROM team_members WHERE user_id = mark_user_id;

    INSERT INTO team_members (id, team_id, user_id, role, joined_at)
    VALUES (gen_random_uuid(), it_team_id, mark_user_id, 'member', NOW())
    ON CONFLICT (team_id, user_id) DO NOTHING;

    UPDATE subscriptions s
    SET user_count = (
        SELECT COUNT(*) FROM users u
        WHERE u.organization_id = boyum_org_id AND COALESCE(u.is_active, true) = true
    ),
    updated_at = NOW()
    WHERE s.organization_id = boyum_org_id;

    RAISE NOTICE 'Mark Keating assigned to Boyum IT Team (%)', it_team_id;
    RAISE NOTICE 'Login: mark@kandeconsulting.com (reset password via admin if needed)';
END $$;

COMMIT;


-- =====================================================
-- STEP 4: VERIFICATION
-- =====================================================

-- Confirm removals
SELECT u.first_name, u.last_name, u.email
FROM users u
WHERE u.organization_id = 'ed4b6ac8-77b8-4842-a67a-7198ec7c9c5e'
  AND (
    (u.first_name ILIKE 'Anthony' AND u.last_name ILIKE 'Roche')
    OR (u.first_name ILIKE 'Elizabeth' AND u.last_name ILIKE 'Wilcox')
    OR (u.first_name ILIKE 'Isabel' AND (u.last_name ILIKE 'Christianson' OR u.last_name ILIKE 'Wollermann'))
    OR (u.first_name ILIKE 'Katy' AND u.last_name ILIKE 'Schultz')
    OR (u.first_name ILIKE 'Travis' AND u.last_name ILIKE 'Noe')
  );
-- Expected: 0 rows

-- Confirm Mark in Boyum IT
SELECT u.email, u.first_name, u.last_name, u.role, t.name AS department, o.name AS org_name
FROM users u
JOIN organizations o ON o.id = u.organization_id
LEFT JOIN team_members tm ON tm.user_id = u.id
LEFT JOIN teams t ON t.id = tm.team_id
WHERE u.email = 'mark@kandeconsulting.com';