-- =====================================================
-- Import Monthly Scorecard Data for Boyum Barenscheer
-- From Ninety.io Monthly Scorecard
-- Data spans: August 2024 through August 2025
-- =====================================================

BEGIN;

DO $$
DECLARE
    org_id UUID;
    leadership_team_id UUID := '00000000-0000-0000-0000-000000000000'::uuid;
    metric_id UUID;
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
    -- 1. WM Total AUM (Wealth Management Total Assets Under Management)
    -- =====================================================
    -- Check if metric exists, update if it does, insert if it doesn't
    SELECT id INTO metric_id 
    FROM scorecard_metrics 
    WHERE organization_id = org_id 
      AND team_id = leadership_team_id 
      AND name = 'WM Total AUM';
    
    IF metric_id IS NULL THEN
        INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
        VALUES (org_id, leadership_team_id, 'WM Total AUM', 100000000, 'monthly', 'Charlie Boyum', 'currency', 'greater_equal', NOW(), NOW())
        RETURNING id INTO metric_id;
    ELSE
        UPDATE scorecard_metrics 
        SET goal = 100000000, 
            type = 'monthly', 
            owner = 'Charlie Boyum',
            value_type = 'currency',
            comparison_operator = 'greater_equal',
            updated_at = NOW()
        WHERE id = metric_id;
    END IF;

    -- Insert monthly scores - from August 2024 to August 2025
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 121815773.00, NOW(), NOW()),  -- August 2024 (rightmost)
    (metric_id, '2024-09-01', 130129822.00, NOW(), NOW()),  -- September 2024
    (metric_id, '2024-10-01', 128956244.00, NOW(), NOW()),  -- October 2024
    (metric_id, '2024-11-01', 133605168.00, NOW(), NOW()),  -- November 2024
    (metric_id, '2024-12-01', 141951999.00, NOW(), NOW()),  -- December 2024
    (metric_id, '2025-01-01', 150137854.00, NOW(), NOW()),  -- January 2025
    (metric_id, '2025-02-01', 150080183.00, NOW(), NOW()),  -- February 2025
    (metric_id, '2025-03-01', 150358370.00, NOW(), NOW())   -- March 2025
    -- April-August 2025 have no data (empty cells)
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 2. WM Monthly Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'WM Monthly Revenue', 62500, 'monthly', 'Charlie Boyum', 'currency', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-09-01', 107151, NOW(), NOW()),  -- September 2024
    (metric_id, '2024-10-01', 67603, NOW(), NOW()),  -- October 2024
    (metric_id, '2024-11-01', 56626, NOW(), NOW()),   -- November 2024
    (metric_id, '2024-12-01', 74331, NOW(), NOW()),   -- December 2024
    (metric_id, '2025-01-01', 67896, NOW(), NOW()),   -- January 2025
    (metric_id, '2025-02-01', 59194, NOW(), NOW()),   -- February 2025
    (metric_id, '2025-03-01', 58038, NOW(), NOW())   -- March 2025
    -- No data for May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 3. Firm Pipeline
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Firm Pipeline', 350000, 'monthly', 'Charlie Boyum', 'currency', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-10-01', 645000, NOW(), NOW()),  -- October 2024
    (metric_id, '2024-11-01', 545000, NOW(), NOW()),  -- November 2024
    (metric_id, '2024-12-01', 580000, NOW(), NOW()),  -- December 2024
    (metric_id, '2025-01-01', 598500, NOW(), NOW()),  -- January 2025
    (metric_id, '2025-02-01', 598500, NOW(), NOW()),  -- February 2025
    (metric_id, '2025-03-01', 598500, NOW(), NOW())   -- March 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 4. New Clients - 12 months
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Clients - 12 months', 0, 'monthly', 'Stacy Barenscheer', 'number', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 657, NOW(), NOW()),     -- August 2024
    (metric_id, '2024-09-01', 646, NOW(), NOW()),     -- September 2024
    (metric_id, '2024-10-01', 652, NOW(), NOW()),     -- October 2024
    -- No data for November 2024
    (metric_id, '2024-12-01', 714, NOW(), NOW()),     -- December 2024
    (metric_id, '2025-01-01', 741, NOW(), NOW()),     -- January 2025
    (metric_id, '2025-02-01', 811, NOW(), NOW()),     -- February 2025
    (metric_id, '2025-03-01', 890, NOW(), NOW()),     -- March 2025
    (metric_id, '2025-04-01', 969, NOW(), NOW()),     -- April 2025
    (metric_id, '2025-05-01', 1109, NOW(), NOW())     -- May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 5. New Client Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Client Revenue', 0, 'monthly', 'Stacy Barenscheer', 'currency', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 1524717.63, NOW(), NOW()),  -- August 2024
    (metric_id, '2024-09-01', 1393476.17, NOW(), NOW()),  -- September 2024
    (metric_id, '2024-10-01', 1449292.64, NOW(), NOW()),  -- October 2024
    -- No data for November 2024
    (metric_id, '2024-12-01', 2557070.92, NOW(), NOW()),  -- December 2024
    (metric_id, '2025-01-01', 2707020.72, NOW(), NOW()),  -- January 2025
    (metric_id, '2025-02-01', 2931527.54, NOW(), NOW()),  -- February 2025
    (metric_id, '2025-03-01', 3351046.25, NOW(), NOW()),  -- March 2025
    (metric_id, '2025-04-01', 3603629.80, NOW(), NOW()),  -- April 2025
    (metric_id, '2025-05-01', 3677287.04, NOW(), NOW())   -- May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 6. New Client Realization
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Client Realization', 89, 'monthly', 'Stacy Barenscheer', 'percentage', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;
    -- No scores available for this metric in the source data

    -- =====================================================
    -- 7. Lost Clients - 12 Months
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Clients - 12 Months', 0, 'monthly', 'Chris Boyum', 'number', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', 1415, NOW(), NOW()),    -- August 2024
    (metric_id, '2024-09-01', 1411, NOW(), NOW()),    -- September 2024
    (metric_id, '2024-10-01', 1401, NOW(), NOW()),    -- October 2024
    -- No data for November 2024
    (metric_id, '2024-12-01', 928, NOW(), NOW()),     -- December 2024
    (metric_id, '2025-01-01', 935, NOW(), NOW()),     -- January 2025
    (metric_id, '2025-02-01', 1054, NOW(), NOW()),    -- February 2025
    (metric_id, '2025-03-01', 1663, NOW(), NOW()),    -- March 2025
    (metric_id, '2025-04-01', 1886, NOW(), NOW()),    -- April 2025
    (metric_id, '2025-05-01', 1202, NOW(), NOW())     -- May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 8. Lost Client Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Client Revenue', 0, 'monthly', 'Chris Boyum', 'currency', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-08-01', -784399.77, NOW(), NOW()),   -- August 2024
    (metric_id, '2024-09-01', -561007.64, NOW(), NOW()),   -- September 2024
    (metric_id, '2024-10-01', -222235.58, NOW(), NOW()),   -- October 2024
    -- No data for November 2024
    (metric_id, '2024-12-01', -2810909.43, NOW(), NOW()),  -- December 2024
    (metric_id, '2025-01-01', -2896699.89, NOW(), NOW()),  -- January 2025
    (metric_id, '2025-02-01', -3123216.14, NOW(), NOW()),  -- February 2025
    (metric_id, '2025-03-01', -4147066.84, NOW(), NOW()),  -- March 2025
    (metric_id, '2025-04-01', -4555927.20, NOW(), NOW()),  -- April 2025
    (metric_id, '2025-05-01', -3694922.30, NOW(), NOW())   -- May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 9. Organic Growth (New Revenue + Lost Revenue)
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Organic Growth', 0, 'monthly', 'Charlie Boyum', 'currency', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    -- No data for December 2024
    -- No data for January 2025
    -- No data for February 2025
    -- No data for March 2025
    (metric_id, '2025-04-01', 1561267.41, NOW(), NOW()),  -- April 2025
    (metric_id, '2025-05-01', 440280.16, NOW(), NOW())    -- May 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 10. Lost Client Realization
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, value_type, comparison_operator, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Client Realization', 0, 'monthly', 'Chris Boyum', 'percentage', 'greater_equal', NOW(), NOW())
    ON CONFLICT (organization_id, team_id, name) 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, value_type = EXCLUDED.value_type, comparison_operator = EXCLUDED.comparison_operator, updated_at = NOW()
    RETURNING id INTO metric_id;
    -- No scores available for this metric in the source data

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
    COUNT(s.id) as score_count,
    MIN(s.week_date) as earliest_score,
    MAX(s.week_date) as latest_score,
    AVG(s.value)::numeric(20,2) as avg_value
FROM scorecard_metrics m
LEFT JOIN scorecard_scores s ON m.id = s.metric_id
WHERE m.organization_id = (SELECT id FROM organizations WHERE slug = 'boyum-barenscheer')
  AND m.type = 'monthly'
GROUP BY m.id, m.name, m.goal, m.type, m.owner
ORDER BY m.name;
*/