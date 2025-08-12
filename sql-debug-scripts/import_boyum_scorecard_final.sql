-- =====================================================
-- Import Monthly Scorecard Data for Boyum Barenscheer
-- Final version - no owner field, proper multi-tenant handling
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    leadership_team_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    v_metric_id UUID;
BEGIN
    -- Get Boyum's organization ID
    SELECT id INTO org_id 
    FROM organizations 
    WHERE slug = 'boyum-barenscheer';
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Boyum Barenscheer organization not found';
    END IF;
    
    RAISE NOTICE 'Importing Monthly Scorecard for Boyum Organization ID: %', org_id;

    -- =====================================================
    -- 1. WM Total AUM
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'WM Total AUM';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'WM Total AUM', 100000000, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 100000000, 
            type = 'monthly', 
            value_type = 'currency',
            comparison_operator = 'greater_equal',
            updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    -- Delete old scores and insert new ones
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-08-01', 121815773.00, NOW(), NOW()),
    (v_metric_id, '2024-09-01', 130129822.00, NOW(), NOW()),
    (v_metric_id, '2024-10-01', 128956244.00, NOW(), NOW()),
    (v_metric_id, '2024-11-01', 133605168.00, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 141951999.00, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 150137854.00, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 150080183.00, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 150358370.00, NOW(), NOW());

    -- =====================================================
    -- 2. WM Monthly Revenue
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'WM Monthly Revenue';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'WM Monthly Revenue', 62500, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 62500, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-09-01', 107151, NOW(), NOW()),
    (v_metric_id, '2024-10-01', 67603, NOW(), NOW()),
    (v_metric_id, '2024-11-01', 56626, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 74331, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 67896, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 59194, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 58038, NOW(), NOW());

    -- =====================================================
    -- 3. Firm Pipeline
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'Firm Pipeline';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'Firm Pipeline', 350000, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 350000, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-10-01', 645000, NOW(), NOW()),
    (v_metric_id, '2024-11-01', 545000, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 580000, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 598500, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 598500, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 598500, NOW(), NOW());

    -- =====================================================
    -- 4. New Clients - 12 months
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'New Clients - 12 months';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'New Clients - 12 months', 0, 'monthly', 'number', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'number', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-08-01', 657, NOW(), NOW()),
    (v_metric_id, '2024-09-01', 646, NOW(), NOW()),
    (v_metric_id, '2024-10-01', 652, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 714, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 741, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 811, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 890, NOW(), NOW()),
    (v_metric_id, '2025-04-01', 969, NOW(), NOW()),
    (v_metric_id, '2025-05-01', 1109, NOW(), NOW());

    -- =====================================================
    -- 5. New Client Revenue
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'New Client Revenue';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'New Client Revenue', 0, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-08-01', 1524717.63, NOW(), NOW()),
    (v_metric_id, '2024-09-01', 1393476.17, NOW(), NOW()),
    (v_metric_id, '2024-10-01', 1449292.64, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 2557070.92, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 2707020.72, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 2931527.54, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 3351046.25, NOW(), NOW()),
    (v_metric_id, '2025-04-01', 3603629.80, NOW(), NOW()),
    (v_metric_id, '2025-05-01', 3677287.04, NOW(), NOW());

    -- =====================================================
    -- 6. New Client Realization
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'New Client Realization';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'New Client Realization', 89, 'monthly', 'percentage', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 89, type = 'monthly', value_type = 'percentage', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    -- No scores for this metric

    -- =====================================================
    -- 7. Lost Clients - 12 Months
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'Lost Clients - 12 Months';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'Lost Clients - 12 Months', 0, 'monthly', 'number', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'number', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-08-01', 1415, NOW(), NOW()),
    (v_metric_id, '2024-09-01', 1411, NOW(), NOW()),
    (v_metric_id, '2024-10-01', 1401, NOW(), NOW()),
    (v_metric_id, '2024-12-01', 928, NOW(), NOW()),
    (v_metric_id, '2025-01-01', 935, NOW(), NOW()),
    (v_metric_id, '2025-02-01', 1054, NOW(), NOW()),
    (v_metric_id, '2025-03-01', 1663, NOW(), NOW()),
    (v_metric_id, '2025-04-01', 1886, NOW(), NOW()),
    (v_metric_id, '2025-05-01', 1202, NOW(), NOW());

    -- =====================================================
    -- 8. Lost Client Revenue
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'Lost Client Revenue';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'Lost Client Revenue', 0, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2024-08-01', -784399.77, NOW(), NOW()),
    (v_metric_id, '2024-09-01', -561007.64, NOW(), NOW()),
    (v_metric_id, '2024-10-01', -222235.58, NOW(), NOW()),
    (v_metric_id, '2024-12-01', -2810909.43, NOW(), NOW()),
    (v_metric_id, '2025-01-01', -2896699.89, NOW(), NOW()),
    (v_metric_id, '2025-02-01', -3123216.14, NOW(), NOW()),
    (v_metric_id, '2025-03-01', -4147066.84, NOW(), NOW()),
    (v_metric_id, '2025-04-01', -4555927.20, NOW(), NOW()),
    (v_metric_id, '2025-05-01', -3694922.30, NOW(), NOW());

    -- =====================================================
    -- 9. Organic Growth
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'Organic Growth';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'Organic Growth', 0, 'monthly', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'currency', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    
    DELETE FROM scorecard_scores WHERE scorecard_scores.metric_id = v_metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (v_metric_id, '2025-04-01', 1561267.41, NOW(), NOW()),
    (v_metric_id, '2025-05-01', 440280.16, NOW(), NOW());

    -- =====================================================
    -- 10. Lost Client Realization
    -- =====================================================
    SELECT id INTO v_metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'Lost Client Realization';
    
    IF v_metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'Lost Client Realization', 0, 'monthly', 'percentage', 'greater_equal', NOW(), NOW())
        RETURNING id INTO v_metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 0, type = 'monthly', value_type = 'percentage', comparison_operator = 'greater_equal', updated_at = NOW()
        WHERE id = v_metric_id;
    END IF;
    -- No scores for this metric

    RAISE NOTICE 'Monthly Scorecard import completed successfully for Boyum Barenscheer';

END $$;

COMMIT;

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this after import to verify data:
/*
SELECT 
    m.name as metric_name,
    m.goal,
    m.type,
    m.value_type,
    m.comparison_operator,
    COUNT(s.id) as score_count,
    MIN(s.week_date) as earliest_score,
    MAX(s.week_date) as latest_score
FROM scorecard_metrics m
LEFT JOIN scorecard_scores s ON m.id = s.v_metric_id
WHERE m.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND m.type = 'monthly'
  AND m.team_id = '00000000-0000-0000-0000-000000000000'
GROUP BY m.id, m.name, m.goal, m.type, m.value_type, m.comparison_operator
ORDER BY m.name;
*/