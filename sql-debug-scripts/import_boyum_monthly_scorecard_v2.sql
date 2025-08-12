-- =====================================================
-- Import Monthly Scorecard Data for Boyum Barenscheer
-- From Ninety.io Monthly Scorecard
-- Data spans: August 2024 through May 2025
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    leadership_team_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    metric_id UUID;
    
    -- Function to upsert metrics
    FUNCTION upsert_metric(
        p_org_id UUID,
        p_team_id UUID,
        p_name VARCHAR,
        p_goal DECIMAL,
        p_owner VARCHAR,
        p_value_type VARCHAR,
        p_comparison_operator VARCHAR
    ) RETURNS UUID AS $func$
    DECLARE
        v_metric_id UUID;
    BEGIN
        -- Check if metric exists
        SELECT id INTO v_metric_id 
        FROM scorecard_metrics 
        WHERE organization_id = p_org_id 
          AND team_id = p_team_id 
          AND name = p_name;
        
        IF v_metric_id IS NULL THEN
            INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
            VALUES (p_org_id, p_team_id, p_name, p_goal, 'monthly', p_owner, p_value_type, p_comparison_operator, NOW(), NOW())
            RETURNING id INTO v_metric_id;
        ELSE
            UPDATE scorecard_metrics 
            SET goal = p_goal, 
                type = 'monthly', 
                owner = p_owner,
                value_type = p_value_type,
                comparison_operator = p_comparison_operator,
                updated_at = NOW()
            WHERE id = v_metric_id;
        END IF;
        
        RETURN v_metric_id;
    END;
    $func$ LANGUAGE plpgsql;
    
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
    metric_id := upsert_metric(org_id, leadership_team_id, 'WM Total AUM', 100000000, 'Charlie Boyum', 'currency', 'greater_equal');
    
    -- Delete existing scores for this metric to avoid duplicates
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    -- Insert monthly scores
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 121815773.00, NOW(), NOW()),
    (metric_id, '2024-09-01', 130129822.00, NOW(), NOW()),
    (metric_id, '2024-10-01', 128956244.00, NOW(), NOW()),
    (metric_id, '2024-11-01', 133605168.00, NOW(), NOW()),
    (metric_id, '2024-12-01', 141951999.00, NOW(), NOW()),
    (metric_id, '2025-01-01', 150137854.00, NOW(), NOW()),
    (metric_id, '2025-02-01', 150080183.00, NOW(), NOW()),
    (metric_id, '2025-03-01', 150358370.00, NOW(), NOW());

    -- =====================================================
    -- 2. WM Monthly Revenue
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'WM Monthly Revenue', 62500, 'Charlie Boyum', 'currency', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-09-01', 107151, NOW(), NOW()),
    (metric_id, '2024-10-01', 67603, NOW(), NOW()),
    (metric_id, '2024-11-01', 56626, NOW(), NOW()),
    (metric_id, '2024-12-01', 74331, NOW(), NOW()),
    (metric_id, '2025-01-01', 67896, NOW(), NOW()),
    (metric_id, '2025-02-01', 59194, NOW(), NOW()),
    (metric_id, '2025-03-01', 58038, NOW(), NOW());

    -- =====================================================
    -- 3. Firm Pipeline
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'Firm Pipeline', 350000, 'Charlie Boyum', 'currency', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-10-01', 645000, NOW(), NOW()),
    (metric_id, '2024-11-01', 545000, NOW(), NOW()),
    (metric_id, '2024-12-01', 580000, NOW(), NOW()),
    (metric_id, '2025-01-01', 598500, NOW(), NOW()),
    (metric_id, '2025-02-01', 598500, NOW(), NOW()),
    (metric_id, '2025-03-01', 598500, NOW(), NOW());

    -- =====================================================
    -- 4. New Clients - 12 months
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'New Clients - 12 months', 0, 'Stacy Barenscheer', 'number', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 657, NOW(), NOW()),
    (metric_id, '2024-09-01', 646, NOW(), NOW()),
    (metric_id, '2024-10-01', 652, NOW(), NOW()),
    (metric_id, '2024-12-01', 714, NOW(), NOW()),
    (metric_id, '2025-01-01', 741, NOW(), NOW()),
    (metric_id, '2025-02-01', 811, NOW(), NOW()),
    (metric_id, '2025-03-01', 890, NOW(), NOW()),
    (metric_id, '2025-04-01', 969, NOW(), NOW()),
    (metric_id, '2025-05-01', 1109, NOW(), NOW());

    -- =====================================================
    -- 5. New Client Revenue
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'New Client Revenue', 0, 'Stacy Barenscheer', 'currency', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 1524717.63, NOW(), NOW()),
    (metric_id, '2024-09-01', 1393476.17, NOW(), NOW()),
    (metric_id, '2024-10-01', 1449292.64, NOW(), NOW()),
    (metric_id, '2024-12-01', 2557070.92, NOW(), NOW()),
    (metric_id, '2025-01-01', 2707020.72, NOW(), NOW()),
    (metric_id, '2025-02-01', 2931527.54, NOW(), NOW()),
    (metric_id, '2025-03-01', 3351046.25, NOW(), NOW()),
    (metric_id, '2025-04-01', 3603629.80, NOW(), NOW()),
    (metric_id, '2025-05-01', 3677287.04, NOW(), NOW());

    -- =====================================================
    -- 6. New Client Realization
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'New Client Realization', 89, 'Stacy Barenscheer', 'percentage', 'greater_equal');
    -- No scores for this metric

    -- =====================================================
    -- 7. Lost Clients - 12 Months
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'Lost Clients - 12 Months', 0, 'Chris Boyum', 'number', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 1415, NOW(), NOW()),
    (metric_id, '2024-09-01', 1411, NOW(), NOW()),
    (metric_id, '2024-10-01', 1401, NOW(), NOW()),
    (metric_id, '2024-12-01', 928, NOW(), NOW()),
    (metric_id, '2025-01-01', 935, NOW(), NOW()),
    (metric_id, '2025-02-01', 1054, NOW(), NOW()),
    (metric_id, '2025-03-01', 1663, NOW(), NOW()),
    (metric_id, '2025-04-01', 1886, NOW(), NOW()),
    (metric_id, '2025-05-01', 1202, NOW(), NOW());

    -- =====================================================
    -- 8. Lost Client Revenue
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'Lost Client Revenue', 0, 'Chris Boyum', 'currency', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', -784399.77, NOW(), NOW()),
    (metric_id, '2024-09-01', -561007.64, NOW(), NOW()),
    (metric_id, '2024-10-01', -222235.58, NOW(), NOW()),
    (metric_id, '2024-12-01', -2810909.43, NOW(), NOW()),
    (metric_id, '2025-01-01', -2896699.89, NOW(), NOW()),
    (metric_id, '2025-02-01', -3123216.14, NOW(), NOW()),
    (metric_id, '2025-03-01', -4147066.84, NOW(), NOW()),
    (metric_id, '2025-04-01', -4555927.20, NOW(), NOW()),
    (metric_id, '2025-05-01', -3694922.30, NOW(), NOW());

    -- =====================================================
    -- 9. Organic Growth
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'Organic Growth', 0, 'Charlie Boyum', 'currency', 'greater_equal');
    
    DELETE FROM scorecard_scores WHERE metric_id = metric_id;
    
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2025-04-01', 1561267.41, NOW(), NOW()),
    (metric_id, '2025-05-01', 440280.16, NOW(), NOW());

    -- =====================================================
    -- 10. Lost Client Realization
    -- =====================================================
    metric_id := upsert_metric(org_id, leadership_team_id, 'Lost Client Realization', 0, 'Chris Boyum', 'percentage', 'greater_equal');
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
    m.owner,
    m.value_type,
    m.comparison_operator,
    COUNT(s.id) as score_count,
    MIN(s.week_date) as earliest_score,
    MAX(s.week_date) as latest_score,
    AVG(s.value)::numeric(20,2) as avg_value
FROM scorecard_metrics m
LEFT JOIN scorecard_scores s ON m.id = s.metric_id
WHERE m.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND m.type = 'monthly'
GROUP BY m.id, m.name, m.goal, m.type, m.owner, m.value_type, m.comparison_operator
ORDER BY m.name;
*/