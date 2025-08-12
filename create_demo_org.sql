-- =====================================================
-- DEMO ORGANIZATION SETUP SCRIPT
-- Creates "Acme Industries" with full sample data
-- =====================================================

-- Clean up any existing demo org (in case we're re-running)
DELETE FROM organizations WHERE slug = 'demo-acme-industries';

-- 1. CREATE ORGANIZATION
INSERT INTO organizations (id, name, slug, subscription_tier, created_at, updated_at)
VALUES (
    'deeeeeee-0000-0000-0000-000000000001',
    'Acme Industries (Demo)',
    'demo-acme-industries',
    'professional',
    NOW(),
    NOW()
);

-- 2. CREATE TEAMS
-- Leadership Team
INSERT INTO teams (id, organization_id, name, is_leadership_team, created_at, updated_at)
VALUES (
    'deeeeeee-1111-0000-0000-000000000001',
    'deeeeeee-0000-0000-0000-000000000001',
    'Leadership Team',
    true,
    NOW(),
    NOW()
);

-- Department Teams
INSERT INTO teams (id, organization_id, name, is_leadership_team, created_at, updated_at)
VALUES 
    ('deeeeeee-1111-0000-0000-000000000002', 'deeeeeee-0000-0000-0000-000000000001', 'Sales', false, NOW(), NOW()),
    ('deeeeeee-1111-0000-0000-000000000003', 'deeeeeee-0000-0000-0000-000000000001', 'Operations', false, NOW(), NOW()),
    ('deeeeeee-1111-0000-0000-000000000004', 'deeeeeee-0000-0000-0000-000000000001', 'Marketing', false, NOW(), NOW()),
    ('deeeeeee-1111-0000-0000-000000000005', 'deeeeeee-0000-0000-0000-000000000001', 'Finance', false, NOW(), NOW());

-- 3. CREATE USERS
-- Password for all demo users: Demo123! (hashed)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, organization_id, created_at, updated_at)
VALUES 
    -- CEO/Admin
    ('deeeeeee-2222-0000-0000-000000000001', 'demo@acme.com', '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', 'Jane', 'Smith', 'admin', 'deeeeeee-0000-0000-0000-000000000001', NOW(), NOW()),
    -- Leadership Team Members
    ('deeeeeee-2222-0000-0000-000000000002', 'coo@acme-demo.com', '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', 'John', 'Davis', 'admin', 'deeeeeee-0000-0000-0000-000000000001', NOW(), NOW()),
    ('deeeeeee-2222-0000-0000-000000000003', 'cfo@acme-demo.com', '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', 'Sarah', 'Johnson', 'member', 'deeeeeee-0000-0000-0000-000000000001', NOW(), NOW()),
    ('deeeeeee-2222-0000-0000-000000000004', 'sales@acme-demo.com', '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', 'Mike', 'Wilson', 'member', 'deeeeeee-0000-0000-0000-000000000001', NOW(), NOW()),
    ('deeeeeee-2222-0000-0000-000000000005', 'marketing@acme-demo.com', '$2a$10$K3KmLLLqOWeL5rzmDPbFp.gGJgYpQzJkgWBMsjWYLwE/FYrc8a6Iq', 'Lisa', 'Brown', 'member', 'deeeeeee-0000-0000-0000-000000000001', NOW(), NOW());

-- 4. ASSIGN USERS TO TEAMS
INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES 
    -- Everyone on Leadership Team
    ('deeeeeee-2222-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 'member', NOW()),
    ('deeeeeee-2222-0000-0000-000000000002', 'deeeeeee-1111-0000-0000-000000000001', 'member', NOW()),
    ('deeeeeee-2222-0000-0000-000000000003', 'deeeeeee-1111-0000-0000-000000000001', 'member', NOW()),
    ('deeeeeee-2222-0000-0000-000000000004', 'deeeeeee-1111-0000-0000-000000000001', 'member', NOW()),
    ('deeeeeee-2222-0000-0000-000000000005', 'deeeeeee-1111-0000-0000-000000000001', 'member', NOW()),
    -- Department assignments
    ('deeeeeee-2222-0000-0000-000000000004', 'deeeeeee-1111-0000-0000-000000000002', 'member', NOW()), -- Mike to Sales
    ('deeeeeee-2222-0000-0000-000000000002', 'deeeeeee-1111-0000-0000-000000000003', 'member', NOW()), -- John to Operations
    ('deeeeeee-2222-0000-0000-000000000005', 'deeeeeee-1111-0000-0000-000000000004', 'member', NOW()), -- Lisa to Marketing
    ('deeeeeee-2222-0000-0000-000000000003', 'deeeeeee-1111-0000-0000-000000000005', 'member', NOW()); -- Sarah to Finance

-- 5. CREATE BUSINESS BLUEPRINT (VTO)
INSERT INTO business_blueprints (id, organization_id, team_id, created_at, updated_at)
VALUES (
    'deeeeeee-3333-0000-0000-000000000001',
    'deeeeeee-0000-0000-0000-000000000001',
    NULL, -- Org-level blueprint
    NOW(),
    NOW()
);

-- 6. ADD CORE VALUES
INSERT INTO core_values (id, vto_id, value_text, description, sort_order)
VALUES 
    (gen_random_uuid(), 'deeeeeee-3333-0000-0000-000000000001', 'Customer First', 'We prioritize customer success in everything we do', 1),
    (gen_random_uuid(), 'deeeeeee-3333-0000-0000-000000000001', 'Innovation', 'We constantly seek better ways to solve problems', 2),
    (gen_random_uuid(), 'deeeeeee-3333-0000-0000-000000000001', 'Integrity', 'We do the right thing, even when no one is watching', 3),
    (gen_random_uuid(), 'deeeeeee-3333-0000-0000-000000000001', 'Teamwork', 'We achieve more together than we ever could alone', 4),
    (gen_random_uuid(), 'deeeeeee-3333-0000-0000-000000000001', 'Excellence', 'We strive for excellence in all our endeavors', 5);

-- 7. ADD CORE FOCUS
INSERT INTO core_focus (id, vto_id, purpose_cause_passion, niche, hedgehog_type)
VALUES (
    gen_random_uuid(),
    'deeeeeee-3333-0000-0000-000000000001',
    'To revolutionize manufacturing through innovative automation solutions',
    'Smart factory automation for mid-size manufacturers',
    'purpose'
);

-- 8. ADD 10-YEAR TARGET (BHAG)
INSERT INTO ten_year_targets (id, vto_id, target_description, target_year, running_total_description)
VALUES (
    gen_random_uuid(),
    'deeeeeee-3333-0000-0000-000000000001',
    'Become the #1 automation provider for mid-market manufacturers in North America',
    2035,
    '$500M in annual revenue'
);

-- 9. ADD MARKETING STRATEGY
INSERT INTO marketing_strategies (
    id, vto_id, target_market, demographic_profile, geographic_profile, 
    psychographic_profile, differentiator_1, differentiator_2, differentiator_3,
    proven_process_exists, guarantee_exists, guarantee_description
)
VALUES (
    gen_random_uuid(),
    'deeeeeee-3333-0000-0000-000000000001',
    'Mid-size manufacturers ($50M-$500M revenue)',
    'Manufacturing companies with 100-1000 employees',
    'North America, focusing on Midwest manufacturing belt',
    'Forward-thinking leaders seeking competitive advantage through technology',
    '24/7 support with 1-hour response time',
    'Modular solutions that scale with your business',
    'ROI guarantee - measurable results in 90 days',
    true,
    true,
    '90-day ROI guarantee or your money back'
);

-- 10. ADD 3-YEAR PICTURE
INSERT INTO three_year_pictures (id, vto_id, future_date, revenue_target, profit_target, what_does_it_look_like)
VALUES (
    gen_random_uuid(),
    'deeeeeee-3333-0000-0000-000000000001',
    '2028-12-31',
    150, -- $150M
    20,  -- 20% profit
    '["200+ enterprise clients", "3 regional offices (Chicago, Dallas, Atlanta)", "Industry-leading NPS score of 70+", "50+ certified implementation partners", "Recognized as a Gartner Magic Quadrant leader", "100+ employees with world-class culture", "Complete product suite covering entire factory automation", "$30M in recurring revenue"]'::jsonb
);

-- 11. ADD 1-YEAR PLAN
INSERT INTO one_year_plans (id, vto_id, future_date, revenue_target, profit_percentage)
VALUES (
    'deeeeeee-4444-0000-0000-000000000001',
    'deeeeeee-3333-0000-0000-000000000001',
    '2025-12-31',
    75, -- $75M
    15  -- 15% profit
);

-- Add 1-Year Goals
INSERT INTO one_year_goals (id, one_year_plan_id, goal_text, is_completed, sort_order)
VALUES 
    (gen_random_uuid(), 'deeeeeee-4444-0000-0000-000000000001', 'Launch Version 3.0 of flagship automation platform', false, 1),
    (gen_random_uuid(), 'deeeeeee-4444-0000-0000-000000000001', 'Open Dallas regional office', false, 2),
    (gen_random_uuid(), 'deeeeeee-4444-0000-0000-000000000001', 'Achieve ISO 27001 certification', false, 3),
    (gen_random_uuid(), 'deeeeeee-4444-0000-0000-000000000001', 'Implement EOS throughout the organization', false, 4),
    (gen_random_uuid(), 'deeeeeee-4444-0000-0000-000000000001', 'Launch partner certification program', false, 5);

-- 12. ADD QUARTERLY PRIORITIES (ROCKS)
INSERT INTO quarterly_priorities (
    id, organization_id, team_id, title, description, owner_id, 
    due_date, status, quarter, year, created_at, updated_at
)
VALUES 
    -- Company Rocks (Q1 2025 ends March 31, 2025)
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Complete Version 3.0 Beta Testing', 'Finish beta testing with 10 key clients and incorporate feedback', 
     'deeeeeee-2222-0000-0000-000000000002', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Hire VP of Sales', 'Recruit and onboard experienced VP to lead sales expansion', 
     'deeeeeee-2222-0000-0000-000000000001', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Implement New CRM System', 'Roll out Salesforce across sales and customer success teams', 
     'deeeeeee-2222-0000-0000-000000000004', '2025-03-31', 'at-risk', 'Q1', 2025, NOW(), NOW()),
    
    -- Department Rocks
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000002', 
     'Close 5 Enterprise Deals', 'Sign 5 new enterprise clients with >$1M annual contracts', 
     'deeeeeee-2222-0000-0000-000000000004', '2025-03-31', 'on-track', 'Q1', 2025, NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000004', 
     'Launch New Website', 'Design and deploy new marketing website with lead generation focus', 
     'deeeeeee-2222-0000-0000-000000000005', '2025-03-31', 'complete', 'Q1', 2025, NOW(), NOW());

-- 13. ADD SCORECARD METRICS
INSERT INTO scorecard_metrics (
    id, organization_id, team_id, name, goal, type, value_type, 
    comparison_operator, owner, display_order
)
VALUES 
    -- Weekly Metrics
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Sales Calls', 50, 'weekly', 'number', 'greater_equal', 'Sales Team', 1),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Customer Satisfaction', 90, 'weekly', 'percentage', 'greater_equal', 'Customer Success', 2),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Support Tickets Resolved', 95, 'weekly', 'percentage', 'greater_equal', 'Support Team', 3),
    
    -- Monthly Metrics
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'Monthly Revenue', 6.25, 'monthly', 'currency', 'greater_equal', 'Finance', 4),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001', 
     'New Customers', 10, 'monthly', 'number', 'greater_equal', 'Sales', 5);

-- 14. ADD SAMPLE SCORECARD SCORES
-- Add some recent weekly scores for the weekly metrics
WITH weekly_metrics AS (
    SELECT id, name FROM scorecard_metrics 
    WHERE organization_id = 'deeeeeee-0000-0000-0000-000000000001' 
    AND type = 'weekly'
)
INSERT INTO scorecard_scores (id, metric_id, week_date, value)
SELECT 
    gen_random_uuid(),
    wm.id,
    dates.week_date,
    CASE 
        WHEN wm.name = 'Sales Calls' THEN 45 + FLOOR(RANDOM() * 15)::decimal
        WHEN wm.name = 'Customer Satisfaction' THEN 85 + FLOOR(RANDOM() * 10)::decimal
        WHEN wm.name = 'Support Tickets Resolved' THEN 90 + FLOOR(RANDOM() * 8)::decimal
    END
FROM weekly_metrics wm
CROSS JOIN (
    SELECT generate_series(
        date_trunc('week', CURRENT_DATE - INTERVAL '8 weeks'),
        date_trunc('week', CURRENT_DATE),
        INTERVAL '1 week'
    )::date as week_date
) dates;

-- 15. ADD ISSUES
INSERT INTO issues (
    id, organization_id, team_id, created_by_id, title, description, 
    priority_rank, status, timeline, created_at, updated_at
)
VALUES 
    -- Long-term Issues
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000002', 'Need to upgrade server infrastructure', 'Current infrastructure won''t support our 3-year growth plans',
     1, 'open', 'long_term', NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000001', 'Develop succession planning', 'Need clear succession plans for key leadership positions',
     2, 'open', 'long_term', NOW(), NOW()),
    
    -- Short-term Issues
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000003', 'Conference room booking conflicts', 'Multiple teams booking same rooms, need better system',
     1, 'open', 'short_term', NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000004', 'Sales team needs updated collateral', 'Marketing materials are outdated for new product features',
     2, 'open', 'short_term', NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000005', 'Slow response times from support', 'Customers reporting slower than usual support response',
     3, 'open', 'short_term', NOW(), NOW());

-- 16. SET ORGANIZATION THEME COLOR (Orange)
UPDATE organizations 
SET theme_accent_color = '#FB923C'  -- Orange color
WHERE id = 'deeeeeee-0000-0000-0000-000000000001';

-- 17. ADD SOME TODOS
INSERT INTO todos (
    id, organization_id, team_id, owner_id, assigned_to_id, 
    title, description, due_date, priority, status, created_at, updated_at
)
VALUES 
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000001', 'deeeeeee-2222-0000-0000-000000000001',
     'Review Q1 financial reports', 'Prepare for board meeting presentation',
     CURRENT_DATE + INTERVAL '3 days', 'high', 'incomplete', NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000001', 'deeeeeee-2222-0000-0000-000000000001',
     'Interview VP Sales candidate', 'Final round interview with top candidate',
     CURRENT_DATE + INTERVAL '2 days', 'high', 'incomplete', NOW(), NOW()),
    
    (gen_random_uuid(), 'deeeeeee-0000-0000-0000-000000000001', 'deeeeeee-1111-0000-0000-000000000001',
     'deeeeeee-2222-0000-0000-000000000002', 'deeeeeee-2222-0000-0000-000000000002',
     'Complete beta testing report', 'Compile feedback from all 10 beta customers',
     CURRENT_DATE + INTERVAL '1 week', 'medium', 'incomplete', NOW(), NOW());

-- =====================================================
-- DEMO ACCESS INFORMATION
-- =====================================================
-- Organization: Acme Industries (Demo)
-- 
-- Login Credentials:
-- Email: demo@acme.com
-- Password: Demo123!
-- 
-- Additional Users (all with password Demo123!):
-- - coo@acme-demo.com (John Davis - COO)
-- - cfo@acme-demo.com (Sarah Johnson - CFO)
-- - sales@acme-demo.com (Mike Wilson - Sales Lead)
-- - marketing@acme-demo.com (Lisa Brown - Marketing Lead)
-- =====================================================

-- Verify the demo org was created successfully
SELECT 
    'Demo organization created successfully!' as status,
    'Login with demo@acme.com / Demo123!' as credentials,
    COUNT(DISTINCT u.id) as users_created,
    COUNT(DISTINCT t.id) as teams_created
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN teams t ON t.organization_id = o.id
WHERE o.slug = 'demo-acme-industries'
GROUP BY o.id;