-- =====================================================
-- Risdall Marketing Group: Add Delivery Team
-- Organization: Risdall Marketing Group
-- =====================================================
-- Creates a Delivery Team alongside the existing Leadership Team
-- and assigns users who were not yet on any team.
--
-- Leadership Team (existing): Alex, Jennifer, Joel, Kelly, Max, Ted, Admin
-- Delivery Team (new): Brandt, Danny, Gabe, Kristen, Lindsay, Nick, Nikki
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID := '02bb7b66-1878-408c-be5f-cfc613df66b7';
    delivery_team_id UUID;
BEGIN
    SELECT id INTO delivery_team_id
    FROM teams
    WHERE organization_id = org_id
      AND name = 'Delivery Team';

    IF delivery_team_id IS NULL THEN
        INSERT INTO teams (id, organization_id, name, description, is_leadership_team, is_active, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            org_id,
            'Delivery Team',
            'Client delivery and execution team',
            false,
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO delivery_team_id;

        RAISE NOTICE 'Created Delivery Team: %', delivery_team_id;
    ELSE
        RAISE NOTICE 'Delivery Team already exists: %', delivery_team_id;
    END IF;

    INSERT INTO team_members (id, user_id, team_id, role, joined_at)
    SELECT gen_random_uuid(), u.id, delivery_team_id, 'member', NOW()
    FROM users u
    WHERE u.organization_id = org_id
      AND u.is_active = true
      AND NOT EXISTS (
          SELECT 1 FROM team_members tm WHERE tm.user_id = u.id
      )
    ON CONFLICT (team_id, user_id) DO NOTHING;

    RAISE NOTICE 'Delivery team setup complete';
END $$;

COMMIT;

-- Verification
SELECT t.name, t.is_leadership_team, COUNT(tm.user_id) AS members
FROM teams t
LEFT JOIN team_members tm ON tm.team_id = t.id
WHERE t.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
GROUP BY t.id, t.name, t.is_leadership_team
ORDER BY t.is_leadership_team DESC, t.name;

SELECT t.name AS team_name, u.first_name || ' ' || u.last_name AS member, u.email
FROM team_members tm
JOIN teams t ON t.id = tm.team_id
JOIN users u ON u.id = tm.user_id
WHERE t.organization_id = '02bb7b66-1878-408c-be5f-cfc613df66b7'
ORDER BY t.name, u.last_name, u.first_name;