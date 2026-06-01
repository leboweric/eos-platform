-- =====================================================
-- Seed Starter Business Blueprint (VTO) for Software Factory
-- Run AFTER create_software_factory_tenant.sql
-- Content pulled/adapted from https://softwarefactory.one/
-- This gives the tenant an immediately professional, Bennett-like appearance
-- =====================================================

DO $$
DECLARE
    v_org_id UUID;
    v_vto_id UUID;
BEGIN
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'software-factory';
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Software Factory org not found. Run create_software_factory_tenant.sql first.';
    END IF;

    -- Get the org-level blueprint (team_id IS NULL)
    SELECT id INTO v_vto_id 
    FROM business_blueprints 
    WHERE organization_id = v_org_id AND team_id IS NULL 
    LIMIT 1;

    IF v_vto_id IS NULL THEN
        -- Create it if missing (should have been created by the tenant script)
        INSERT INTO business_blueprints (id, organization_id, team_id, created_at, updated_at)
        VALUES (gen_random_uuid(), v_org_id, NULL, NOW(), NOW())
        RETURNING id INTO v_vto_id;
        RAISE NOTICE 'Created missing org-level blueprint';
    END IF;

    RAISE NOTICE 'Seeding VTO content for Software Factory into blueprint %', v_vto_id;

    -- ========================================
    -- 10-YEAR TARGET (or Vision)
    -- ========================================
    INSERT INTO ten_year_targets (vto_id, target_text, created_at, updated_at)
    VALUES (
        v_vto_id,
        'The operating system for how mid-market businesses actually build and evolve their own systems — no consultants, no tickets, pure self-service power at the speed of thought.',
        NOW(), NOW()
    )
    ON CONFLICT (vto_id) DO UPDATE SET target_text = EXCLUDED.target_text;

    -- ========================================
    -- MARKETING STRATEGY / Core Focus
    -- ========================================
    INSERT INTO marketing_strategies (vto_id, unique_value_proposition, created_at, updated_at)
    VALUES (
        v_vto_id,
        'Stop Buying Software. Start Building It. We build the foundation — then hand you Zeus, our agentic AI interface, so you can add features, workflows, and functionality on your own in plain English.',
        NOW(), NOW()
    )
    ON CONFLICT (vto_id) DO UPDATE SET unique_value_proposition = EXCLUDED.unique_value_proposition;

    -- ========================================
    -- CORE VALUES (3-5 strong ones adapted from the platform philosophy)
    -- ========================================
    -- Clear any previous demo values first if you want a clean slate (comment out if preserving)
    -- DELETE FROM core_values WHERE vto_id = v_vto_id;

    INSERT INTO core_values (vto_id, value_text, description, sort_order, created_at, updated_at)
    VALUES 
        (v_vto_id, 'Customer as Builder', 
         'We don''t deliver finished software — we deliver the power to build. Every decision empowers the customer to create, extend, and own their system without us.',
         1, NOW(), NOW()),
        (v_vto_id, 'Speed as a Feature', 
         'Weeks to live, not months or years. From first conversation to production value in record time. The system must evolve at the speed of the customer''s business.',
         2, NOW(), NOW()),
        (v_vto_id, 'Zero Vendor Lock-in', 
         'True ownership means the customer can keep building forever without tickets, consultants, or change orders. We win when they never need us again for customization.',
         3, NOW(), NOW()),
        (v_vto_id, 'AI as the Interface', 
         'Plain English is the new API. Zeus turns intent into working features, workflows, and reports instantly. The best software feels like talking to a brilliant teammate.',
         4, NOW(), NOW())
    ON CONFLICT DO NOTHING;

    -- ========================================
    -- CORE FOCUS (Purpose + Passion / Niche)
    -- ========================================
    INSERT INTO core_focus (vto_id, purpose_cause_passion, our_niche, created_at, updated_at)
    VALUES (
        v_vto_id,
        'Eliminate the soul-crushing dependency on consultants and vendors so businesses can finally own and shape the systems that run their lives.',
        'Mid-market companies in manufacturing, construction, professional services, distribution, healthcare, and equipment who are tired of paying hundreds of thousands and waiting 18 months for rigid ERP that they can never truly customize.',
        NOW(), NOW()
    )
    ON CONFLICT (vto_id) DO UPDATE 
    SET purpose_cause_passion = EXCLUDED.purpose_cause_passion,
        our_niche = EXCLUDED.our_niche;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Software Factory VTO seeded with powerful, on-brand content!';
    RAISE NOTICE 'Open the Business Blueprint / 2-Page Plan in the app to review and refine.';
    RAISE NOTICE '========================================';

END $$;

-- Quick verification
SELECT 
    'VTO SEED CHECK' as check,
    (SELECT COUNT(*) FROM ten_year_targets WHERE vto_id = (SELECT id FROM business_blueprints WHERE organization_id = (SELECT id FROM organizations WHERE slug='software-factory') AND team_id IS NULL)) as has_10yr,
    (SELECT COUNT(*) FROM core_values WHERE vto_id = (SELECT id FROM business_blueprints WHERE organization_id = (SELECT id FROM organizations WHERE slug='software-factory') AND team_id IS NULL)) as core_values_count;