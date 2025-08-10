-- =====================================================
-- Import Monthly Scorecard Data for Boyum Barenscheer
-- From Ninety.io Monthly Scorecard
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
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'WM Total AUM', 100000000, 'monthly', 'Charlie Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    -- Insert monthly scores for WM Total AUM
    -- Reading right to left from the image: August 2024 is leftmost, then July, June, May, April, March, Feb, Jan
    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-09-01', 121815773.00, NOW(), NOW()),  -- September (far right in August column)
    (metric_id, '2024-10-01', 130129822.00, NOW(), NOW()),  -- October
    (metric_id, '2024-11-01', 128956244.00, NOW(), NOW()),  -- November  
    (metric_id, '2024-12-01', 133605168.00, NOW(), NOW()),  -- December
    (metric_id, '2025-01-01', 141951999.00, NOW(), NOW()),  -- January 2025
    (metric_id, '2025-02-01', 150137854.00, NOW(), NOW()),  -- February 2025
    (metric_id, '2025-03-01', 150080183.00, NOW(), NOW()),  -- March 2025
    (metric_id, '2025-04-01', 150358370.00, NOW(), NOW())   -- April 2025
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 2. WM Monthly Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'WM Monthly Revenue', 62500, 'monthly', 'Charlie Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 59194, NOW(), NOW()),
    (metric_id, '2024-02-01', 74331, NOW(), NOW()),
    (metric_id, '2024-03-01', 67896, NOW(), NOW()),
    (metric_id, '2024-04-01', 56626, NOW(), NOW()),
    (metric_id, '2024-05-01', 67603, NOW(), NOW()),
    (metric_id, '2024-06-01', 107151, NOW(), NOW()),
    (metric_id, '2024-07-01', 65411, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 3. Firm Pipeline
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Firm Pipeline', 350000, 'monthly', 'Charlie Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 598500, NOW(), NOW()),
    (metric_id, '2024-02-01', 598500, NOW(), NOW()),
    (metric_id, '2024-03-01', 598500, NOW(), NOW()),
    (metric_id, '2024-04-01', 580000, NOW(), NOW()),
    (metric_id, '2024-05-01', 545000, NOW(), NOW()),
    (metric_id, '2024-06-01', 645000, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 4. New Clients - 12 months
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Clients - 12 months', 0, 'monthly', 'Stacy Barenscheer', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 1109, NOW(), NOW()),
    (metric_id, '2024-02-01', 969, NOW(), NOW()),
    (metric_id, '2024-03-01', 890, NOW(), NOW()),
    (metric_id, '2024-04-01', 811, NOW(), NOW()),
    (metric_id, '2024-05-01', 741, NOW(), NOW()),
    (metric_id, '2024-06-01', 714, NOW(), NOW()),
    (metric_id, '2024-07-01', 652, NOW(), NOW()),
    (metric_id, '2024-08-01', 646, NOW(), NOW()),
    (metric_id, '2024-09-01', 657, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 5. New Client Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Client Revenue', 0, 'monthly', 'Stacy Barenscheer', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 3677287.04, NOW(), NOW()),
    (metric_id, '2024-02-01', 3603629.80, NOW(), NOW()),
    (metric_id, '2024-03-01', 3351046.25, NOW(), NOW()),
    (metric_id, '2024-04-01', 2931527.54, NOW(), NOW()),
    (metric_id, '2024-05-01', 2707020.72, NOW(), NOW()),
    (metric_id, '2024-06-01', 2557079.92, NOW(), NOW()),
    (metric_id, '2024-07-01', 1449292.64, NOW(), NOW()),
    (metric_id, '2024-08-01', 1393476.17, NOW(), NOW()),
    (metric_id, '2024-09-01', 1524717.63, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 6. New Client Realization
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'New Client Realization', 89, 'monthly', 'Stacy Barenscheer', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;
    -- No scores available for this metric in the source data

    -- =====================================================
    -- 7. Lost Clients - 12 Months
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Clients - 12 Months', 0, 'monthly', 'Chris Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 1202, NOW(), NOW()),
    (metric_id, '2024-02-01', 1886, NOW(), NOW()),
    (metric_id, '2024-03-01', 1663, NOW(), NOW()),
    (metric_id, '2024-04-01', 1054, NOW(), NOW()),
    (metric_id, '2024-05-01', 935, NOW(), NOW()),
    (metric_id, '2024-06-01', 928, NOW(), NOW()),
    (metric_id, '2024-09-01', 1401, NOW(), NOW()),
    (metric_id, '2024-10-01', 1411, NOW(), NOW()),
    (metric_id, '2024-11-01', 1415, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 8. Lost Client Revenue
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Client Revenue', 0, 'monthly', 'Chris Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', -3694922.30, NOW(), NOW()),
    (metric_id, '2024-02-01', -4555927.20, NOW(), NOW()),
    (metric_id, '2024-03-01', -4147066.84, NOW(), NOW()),
    (metric_id, '2024-04-01', -3123216.14, NOW(), NOW()),
    (metric_id, '2024-05-01', -2896699.89, NOW(), NOW()),
    (metric_id, '2024-06-01', -2810909.43, NOW(), NOW()),
    (metric_id, '2024-09-01', -222235.58, NOW(), NOW()),
    (metric_id, '2024-10-01', -561007.64, NOW(), NOW()),
    (metric_id, '2024-11-01', -784399.77, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 9. Organic Growth (New Revenue + Lost Revenue)
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Organic Growth', 0, 'monthly', 'Charlie Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
    RETURNING id INTO metric_id;

    INSERT INTO scorecard_scores (metric_id, week_date, value, created_at, updated_at) VALUES
    (metric_id, '2024-01-01', 440280.16, NOW(), NOW()),
    (metric_id, '2024-02-01', 1561267.41, NOW(), NOW()),
    (metric_id, '2024-03-01', 1387616.26, NOW(), NOW()),
    (metric_id, '2024-04-01', 815552.47, NOW(), NOW()),
    (metric_id, '2024-05-01', 530017.83, NOW(), NOW()),
    (metric_id, '2024-06-01', 768900.64, NOW(), NOW())
    ON CONFLICT (metric_id, week_date) 
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

    -- =====================================================
    -- 10. Lost Client Realization
    -- =====================================================
    INSERT INTO scorecard_metrics (organization_id, team_id, name, goal, type, owner, created_at, updated_at)
    VALUES (org_id, leadership_team_id, 'Lost Client Realization', 0, 'monthly', 'Chris Boyum', NOW(), NOW())
    ON CONFLICT ON CONSTRAINT unique_metric_per_team 
    DO UPDATE SET goal = EXCLUDED.goal, type = EXCLUDED.type, updated_at = NOW()
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