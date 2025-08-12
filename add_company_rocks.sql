-- =====================================================
-- ADD COMPANY-LEVEL ROCKS FOR DEMO ORGANIZATION
-- =====================================================

-- First, let's check what rocks already exist
SELECT 
  qp.title,
  qp.quarter,
  qp.year,
  t.name as team_name,
  t.is_leadership_team
FROM quarterly_priorities qp
JOIN teams t ON qp.team_id = t.id
WHERE qp.organization_id = 'deeeeeee-0000-0000-0000-000000000001'
ORDER BY t.is_leadership_team DESC, qp.created_at;

-- Now add proper Company-level Rocks (these should be associated with NULL team_id for true company-level)
-- Company rocks don't have a team_id, they belong to the organization directly
INSERT INTO quarterly_priorities (
    id, organization_id, team_id, title, description, owner_id, 
    due_date, status, quarter, year, created_at, updated_at
)
VALUES 
    -- Q1 2025 Company Rocks
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', NULL, 
     'Launch Version 3.0 Platform', 'Complete development, testing, and launch of our next-generation automation platform with AI capabilities', 
     'deeeeeee-2222-0000-0000-000000000002', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', NULL, 
     'Achieve $20M Q1 Revenue', 'Hit quarterly revenue target through new enterprise sales and expansion of existing accounts', 
     'deeeeeee-2222-0000-0000-000000000004', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', NULL, 
     'Open Dallas Office', 'Establish and staff new regional office in Dallas to support Southwest expansion', 
     'deeeeeee-2222-0000-0000-000000000001', '2025-03-31', 'at-risk', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', NULL, 
     'Implement Full EOS', 'Complete EOS implementation across all departments with Level 10 meetings running company-wide', 
     'deeeeeee-2222-0000-0000-000000000002', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', NULL, 
     'ISO 27001 Certification', 'Achieve ISO 27001 certification for information security management', 
     'deeeeeee-2222-0000-0000-000000000003', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW());

-- Add milestones for one of the Company Rocks
DO $$
DECLARE
    v_rock_id UUID;
BEGIN
    -- Get the ID of the "Launch Version 3.0 Platform" rock
    SELECT id INTO v_rock_id 
    FROM quarterly_priorities 
    WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001' 
      AND team_id IS NULL
      AND title = 'Launch Version 3.0 Platform'
    LIMIT 1;
    
    -- Add milestones for this rock
    IF v_rock_id IS NOT NULL THEN
        INSERT INTO priority_milestones (
            id, priority_id, title, due_date, completed, owner_id, display_order, status
        )
        VALUES 
            (gen_random_uuid(), v_rock_id, 'Complete beta testing with 10 key clients', '2025-01-31', true, 'deeeeeee-2222-0000-0000-000000000002', 1, 'completed'),
            (gen_random_uuid(), v_rock_id, 'Finalize feature set based on beta feedback', '2025-02-15', true, 'deeeeeee-2222-0000-0000-000000000002', 2, 'completed'),
            (gen_random_uuid(), v_rock_id, 'Complete security audit and penetration testing', '2025-02-28', false, 'deeeeeee-2222-0000-0000-000000000002', 3, 'in_progress'),
            (gen_random_uuid(), v_rock_id, 'Launch marketing campaign and sales enablement', '2025-03-15', false, 'deeeeeee-2222-0000-0000-000000000005', 4, 'not_started'),
            (gen_random_uuid(), v_rock_id, 'Go-live with first 5 production customers', '2025-03-31', false, 'deeeeeee-2222-0000-0000-000000000002', 5, 'not_started');
    END IF;
    
    -- Get the ID of the "Achieve $20M Q1 Revenue" rock
    SELECT id INTO v_rock_id 
    FROM quarterly_priorities 
    WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001' 
      AND team_id IS NULL
      AND title = 'Achieve $20M Q1 Revenue'
    LIMIT 1;
    
    -- Add milestones for revenue rock
    IF v_rock_id IS NOT NULL THEN
        INSERT INTO priority_milestones (
            id, priority_id, title, due_date, completed, owner_id, display_order, status
        )
        VALUES 
            (gen_random_uuid(), v_rock_id, 'Close $6M in January', '2025-01-31', true, 'deeeeeee-2222-0000-0000-000000000004', 1, 'completed'),
            (gen_random_uuid(), v_rock_id, 'Close $7M in February', '2025-02-28', false, 'deeeeeee-2222-0000-0000-000000000004', 2, 'in_progress'),
            (gen_random_uuid(), v_rock_id, 'Close $7M in March', '2025-03-31', false, 'deeeeeee-2222-0000-0000-000000000004', 3, 'not_started'),
            (gen_random_uuid(), v_rock_id, 'Sign 3 enterprise deals >$1M each', '2025-03-31', false, 'deeeeeee-2222-0000-0000-000000000004', 4, 'in_progress');
    END IF;
END $$;

-- Verify the Company Rocks were added
SELECT 
  'Company Rocks Added:' as status,
  COUNT(*) as company_rocks_count
FROM quarterly_priorities 
WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001'
  AND team_id IS NULL;