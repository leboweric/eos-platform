-- ============================================================================
-- EOS PLATFORM DEMO DATA TEMPLATE
-- ============================================================================
-- This template creates a complete, realistic demo environment for prospect
-- organizations. Customize the variables below and execute.
--
-- PREREQUISITES:
-- 1. Organization already created in the system
-- 2. CEO user account already created (will be used as the main demo user)
-- 3. Have the organization_id and CEO user_id ready
--
-- WHAT THIS CREATES:
-- - 8 Users (CEO + 7 team members)
-- - 5 Teams (Leadership + 4 functional teams)
-- - Complete Business Blueprint (VTO) with all components
-- - 10 Quarterly Priorities (Rocks) with milestones
-- - 12 Scorecard Metrics with 13 weeks of historical data
-- - 12 To-Dos across teams
-- - 10 Issues for IDS demonstration
-- - 8 Headlines (good news)
-- - Organizational Chart (8 positions with hierarchy)
-- ============================================================================

-- ============================================================================
-- STEP 1: CUSTOMIZE THESE VARIABLES
-- ============================================================================

DO $$
DECLARE
    -- ========================================
    -- REQUIRED: Replace with actual values
    -- ========================================
    v_org_id UUID := '{{ORGANIZATION_ID}}';  -- Replace with actual organization ID
    v_ceo_user_id UUID := '{{CEO_USER_ID}}'; -- Replace with actual CEO user ID
    
    -- ========================================
    -- COMPANY INFORMATION
    -- ========================================
    v_company_name VARCHAR := '{{COMPANY_NAME}}';  -- e.g., 'Carousel Signage'
    v_company_domain VARCHAR := '{{COMPANY_DOMAIN}}';  -- e.g., 'carouselsignage.com'
    v_industry VARCHAR := '{{INDUSTRY}}';  -- e.g., 'Digital Signage Software'
    
    -- ========================================
    -- CEO INFORMATION (for display purposes)
    -- ========================================
    v_ceo_first_name VARCHAR := '{{CEO_FIRST_NAME}}';  -- e.g., 'JJ'
    v_ceo_last_name VARCHAR := '{{CEO_LAST_NAME}}';  -- e.g., 'Parker'
    v_ceo_email VARCHAR := '{{CEO_EMAIL}}';  -- e.g., 'jj.parker@company.com'
    
    -- ========================================
    -- BUSINESS CONTEXT (customize for industry)
    -- ========================================
    v_target_market VARCHAR := '{{TARGET_MARKET}}';  -- e.g., 'K-12 schools, higher education, government, corporate'
    v_core_product VARCHAR := '{{CORE_PRODUCT}}';  -- e.g., 'Cloud-based digital signage platform'
    
    -- ========================================
    -- Generated IDs (do not modify)
    -- ========================================
    v_chart_id UUID;
    v_blueprint_id UUID;
    v_leadership_team_id UUID;
    v_sales_team_id UUID;
    v_product_team_id UUID;
    v_marketing_team_id UUID;
    v_cs_team_id UUID;
    
    -- User IDs
    v_user_sarah_id UUID;
    v_user_mike_id UUID;
    v_user_emily_id UUID;
    v_user_david_id UUID;
    v_user_lisa_id UUID;
    v_user_tom_id UUID;
    v_user_rachel_id UUID;
    
    -- Position IDs
    v_pos_ceo_id UUID;
    v_pos_vp_sales_id UUID;
    v_pos_vp_product_id UUID;
    v_pos_vp_marketing_id UUID;
    v_pos_vp_cs_id UUID;
    v_pos_sales_rep_id UUID;
    v_pos_pm_id UUID;
    v_pos_support_id UUID;
    
    -- Rock IDs
    v_rock_ids UUID[];
    
    -- Metric IDs
    v_metric_ids UUID[];

BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating demo data for: %', v_company_name;
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'CEO User ID: %', v_ceo_user_id;
    RAISE NOTICE '========================================';

    -- ========================================================================
    -- STEP 2: CREATE USERS
    -- ========================================================================
    RAISE NOTICE 'Creating users...';
    
    -- VP of Sales
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'sarah.chen@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Sarah', 'Chen', true, true
    ) RETURNING id INTO v_user_sarah_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_sarah_id, v_org_id, 'member');
    
    -- VP of Product & Engineering
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'mike.rodriguez@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Mike', 'Rodriguez', true, true
    ) RETURNING id INTO v_user_mike_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_mike_id, v_org_id, 'member');
    
    -- VP of Marketing
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'emily.thompson@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Emily', 'Thompson', true, true
    ) RETURNING id INTO v_user_emily_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_emily_id, v_org_id, 'member');
    
    -- VP of Customer Success
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'david.kim@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'David', 'Kim', true, true
    ) RETURNING id INTO v_user_david_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_david_id, v_org_id, 'member');
    
    -- Senior Sales Representative
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'lisa.martinez@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Lisa', 'Martinez', true, true
    ) RETURNING id INTO v_user_lisa_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_lisa_id, v_org_id, 'member');
    
    -- Senior Product Manager
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'tom.anderson@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Tom', 'Anderson', true, true
    ) RETURNING id INTO v_user_tom_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_tom_id, v_org_id, 'member');
    
    -- Customer Support Manager
    INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, email_verified)
    VALUES (
        gen_random_uuid(),
        'rachel.patel@' || v_company_domain,
        '$2a$10$rHj0HqS7J9zqQxQxQxQxQOqQxQxQxQxQxQxQxQxQxQxQxQxQxQxQx',
        'Rachel', 'Patel', true, true
    ) RETURNING id INTO v_user_rachel_id;
    
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (v_user_rachel_id, v_org_id, 'member');
    
    RAISE NOTICE 'Created 7 team member users';

    -- ========================================================================
    -- STEP 3: CREATE TEAMS
    -- ========================================================================
    RAISE NOTICE 'Creating teams...';
    
    INSERT INTO teams (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Leadership Team',
        'Executive leadership team responsible for strategic direction',
        v_ceo_user_id
    ) RETURNING id INTO v_leadership_team_id;
    
    INSERT INTO teams (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Sales Team',
        'Revenue generation and customer acquisition',
        v_ceo_user_id
    ) RETURNING id INTO v_sales_team_id;
    
    INSERT INTO teams (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Product & Engineering',
        'Product development and technical innovation',
        v_ceo_user_id
    ) RETURNING id INTO v_product_team_id;
    
    INSERT INTO teams (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Marketing Team',
        'Brand awareness and demand generation',
        v_ceo_user_id
    ) RETURNING id INTO v_marketing_team_id;
    
    INSERT INTO teams (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        'Customer Success',
        'Customer retention and satisfaction',
        v_ceo_user_id
    ) RETURNING id INTO v_cs_team_id;
    
    RAISE NOTICE 'Created 5 teams';

    -- ========================================================================
    -- STEP 4: ADD TEAM MEMBERS
    -- ========================================================================
    RAISE NOTICE 'Adding team members...';
    
    -- Leadership Team (all VPs + CEO)
    INSERT INTO team_members (team_id, user_id) VALUES
        (v_leadership_team_id, v_ceo_user_id),
        (v_leadership_team_id, v_user_sarah_id),
        (v_leadership_team_id, v_user_mike_id),
        (v_leadership_team_id, v_user_emily_id),
        (v_leadership_team_id, v_user_david_id);
    
    -- Sales Team
    INSERT INTO team_members (team_id, user_id) VALUES
        (v_sales_team_id, v_user_sarah_id),
        (v_sales_team_id, v_user_lisa_id);
    
    -- Product Team
    INSERT INTO team_members (team_id, user_id) VALUES
        (v_product_team_id, v_user_mike_id),
        (v_product_team_id, v_user_tom_id);
    
    -- Marketing Team
    INSERT INTO team_members (team_id, user_id) VALUES
        (v_marketing_team_id, v_user_emily_id);
    
    -- Customer Success Team
    INSERT INTO team_members (team_id, user_id) VALUES
        (v_cs_team_id, v_user_david_id),
        (v_cs_team_id, v_user_rachel_id);
    
    RAISE NOTICE 'Added team members to all teams';

    -- ========================================================================
    -- STEP 5: CREATE BUSINESS BLUEPRINT (VTO)
    -- ========================================================================
    RAISE NOTICE 'Creating Business Blueprint (VTO)...';
    
    INSERT INTO business_blueprints (
        id,
        organization_id,
        team_id,
        core_purpose,
        core_values,
        ten_year_target,
        marketing_strategy,
        three_year_target,
        one_year_target
    ) VALUES (
        gen_random_uuid(),
        v_org_id,
        v_leadership_team_id,
        'Empower organizations to communicate effectively through innovative ' || v_core_product || ' solutions',
        '["Innovation First", "Customer Obsessed", "Integrity Always", "Team Excellence", "Continuous Improvement"]'::jsonb,
        'Be the #1 ' || v_industry || ' platform globally with 50,000+ customers and $500M ARR',
        'Target Market: ' || v_target_market || E'\n\nUnique Value Proposition: Enterprise-grade ' || v_core_product || ' with unmatched ease of use and reliability\n\nGuarantee: 99.9% uptime SLA with 24/7 support\n\nProven Process: Onboarding in 48 hours, ROI in 90 days',
        E'Revenue: $50M ARR\nCustomers: 5,000 active organizations\nTeam: 150 employees across all departments\nMarket Position: Top 3 ' || v_industry || ' provider in North America\nProduct: Full platform suite with AI-powered features\nCulture: Best place to work in tech (certified)',
        E'Revenue: $15M ARR (50% growth)\nNew Customers: 800 net new organizations\nTeam: 45 employees (15 new hires)\nProduct: Launch 3 major features\nMarket: Expand to 2 new verticals\nOperations: Achieve 90% customer satisfaction score'
    ) RETURNING id INTO v_blueprint_id;
    
    RAISE NOTICE 'Created Business Blueprint';

    -- ========================================================================
    -- STEP 6: CREATE QUARTERLY PRIORITIES (ROCKS) - Q4 2025
    -- ========================================================================
    RAISE NOTICE 'Creating Quarterly Priorities (Rocks)...';
    
    v_rock_ids := ARRAY[]::UUID[];
    
    -- Rock 1: CEO - Series A Funding
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id, v_ceo_user_id, v_ceo_user_id,
            'Close Series A Funding Round ($10M)',
            'Secure Series A funding to fuel growth and product development',
            'Q4', 2025, 'on-track', 65, true, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[1] FROM new_rock;
    
    -- Add milestones for Series A rock
    INSERT INTO rock_milestones (priority_id, title, due_date, completed) VALUES
        (v_rock_ids[1], 'Complete financial projections and pitch deck', '2025-10-15', true),
        (v_rock_ids[1], 'Initial meetings with 10 VC firms', '2025-11-01', true),
        (v_rock_ids[1], 'Receive 3 term sheets', '2025-11-20', false),
        (v_rock_ids[1], 'Complete due diligence', '2025-12-15', false),
        (v_rock_ids[1], 'Close funding round', '2025-12-31', false);
    
    -- Rock 2: CEO - 2026 Strategic Plan
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id, v_ceo_user_id, v_ceo_user_id,
            'Complete 2026 Strategic Plan',
            'Develop comprehensive strategic plan for 2026 with input from all departments',
            'Q4', 2025, 'on-track', 70, true, '2025-12-20'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[2] FROM new_rock;
    
    -- Add milestones for Strategic Plan rock
    INSERT INTO rock_milestones (priority_id, title, due_date, completed) VALUES
        (v_rock_ids[2], 'Gather department input and market analysis', '2025-10-31', true),
        (v_rock_ids[2], 'Draft strategic initiatives and goals', '2025-11-15', true),
        (v_rock_ids[2], 'Leadership team review and refinement', '2025-12-01', false),
        (v_rock_ids[2], 'Board presentation and approval', '2025-12-20', false);
    
    -- Rock 3: VP Sales - Revenue Target
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_sales_team_id, v_user_sarah_id, v_ceo_user_id,
            'Achieve $3.5M in Q4 Revenue',
            'Close $3.5M in new and expansion revenue to hit annual target',
            'Q4', 2025, 'on-track', 58, true, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[3] FROM new_rock;
    
    -- Rock 4: VP Sales - Enterprise Deals
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_sales_team_id, v_user_sarah_id, v_ceo_user_id,
            'Close 5 Enterprise Deals (>$100K ACV)',
            'Land 5 enterprise customers to establish market presence',
            'Q4', 2025, 'at-risk', 40, false, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[4] FROM new_rock;
    
    -- Rock 5: VP Product - Mobile App Launch
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_product_team_id, v_user_mike_id, v_ceo_user_id,
            'Launch Mobile App (iOS & Android)',
            'Release mobile app to app stores with core functionality',
            'Q4', 2025, 'on-track', 75, true, '2025-12-15'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[5] FROM new_rock;
    
    -- Rock 6: VP Product - AI Features
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_product_team_id, v_user_mike_id, v_ceo_user_id,
            'Ship AI-Powered Content Recommendations',
            'Launch AI feature for automated content suggestions',
            'Q4', 2025, 'on-track', 55, false, '2025-12-20'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[6] FROM new_rock;
    
    -- Rock 7: VP Marketing - Lead Generation
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_marketing_team_id, v_user_emily_id, v_ceo_user_id,
            'Generate 500 Qualified Leads',
            'Drive 500 MQLs through digital marketing campaigns',
            'Q4', 2025, 'on-track', 62, false, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[7] FROM new_rock;
    
    -- Rock 8: VP Marketing - Brand Refresh
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_marketing_team_id, v_user_emily_id, v_ceo_user_id,
            'Complete Brand Refresh & New Website',
            'Launch updated brand identity and redesigned website',
            'Q4', 2025, 'on-track', 80, true, '2025-11-30'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[8] FROM new_rock;
    
    -- Rock 9: VP Customer Success - NPS Score
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_cs_team_id, v_user_david_id, v_ceo_user_id,
            'Achieve NPS Score of 50+',
            'Improve customer satisfaction to world-class NPS level',
            'Q4', 2025, 'on-track', 70, false, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[9] FROM new_rock;
    
    -- Rock 10: VP Customer Success - Churn Reduction
    WITH new_rock AS (
        INSERT INTO quarterly_priorities (
            id, organization_id, team_id, owner_id, created_by,
            title, description, quarter, year, status, progress, is_company_priority, due_date
        ) VALUES (
            gen_random_uuid(), v_org_id, v_cs_team_id, v_user_david_id, v_ceo_user_id,
            'Reduce Churn to <3% Monthly',
            'Implement retention program to reduce customer churn',
            'Q4', 2025, 'at-risk', 45, true, '2025-12-31'
        ) RETURNING id
    )
    SELECT id INTO v_rock_ids[10] FROM new_rock;
    
    RAISE NOTICE 'Created 10 Quarterly Priorities with milestones';

    -- ========================================================================
    -- STEP 7: CREATE SCORECARD METRICS WITH HISTORICAL DATA
    -- ========================================================================
    RAISE NOTICE 'Creating Scorecard Metrics...';
    
    v_metric_ids := ARRAY[]::UUID[];
    
    -- Metric 1: Weekly Revenue
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Weekly Revenue', 'Sarah Chen', 250000, 'weekly', 'currency', 'greater_equal', 1
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[1] FROM new_metric;
    
    -- Metric 2: New Customers
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'New Customers', 'Sarah Chen', 15, 'weekly', 'number', 'greater_equal', 2
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[2] FROM new_metric;
    
    -- Metric 3: Sales Pipeline Value
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Sales Pipeline Value', 'Sarah Chen', 5000000, 'weekly', 'currency', 'greater_equal', 3
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[3] FROM new_metric;
    
    -- Metric 4: Product Deployments
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Product Deployments', 'Mike Rodriguez', 3, 'weekly', 'number', 'greater_equal', 4
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[4] FROM new_metric;
    
    -- Metric 5: Code Quality Score
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Code Quality Score', 'Mike Rodriguez', 85, 'weekly', 'percentage', 'greater_equal', 5
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[5] FROM new_metric;
    
    -- Metric 6: Website Visitors
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Website Visitors', 'Emily Thompson', 5000, 'weekly', 'number', 'greater_equal', 6
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[6] FROM new_metric;
    
    -- Metric 7: Marketing Qualified Leads
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Marketing Qualified Leads', 'Emily Thompson', 40, 'weekly', 'number', 'greater_equal', 7
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[7] FROM new_metric;
    
    -- Metric 8: Customer Satisfaction (CSAT)
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Customer Satisfaction (CSAT)', 'David Kim', 90, 'weekly', 'percentage', 'greater_equal', 8
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[8] FROM new_metric;
    
    -- Metric 9: Support Ticket Resolution Time
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Avg Support Resolution Time (hrs)', 'David Kim', 4, 'weekly', 'number', 'less_equal', 9
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[9] FROM new_metric;
    
    -- Metric 10: Monthly Recurring Revenue
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Monthly Recurring Revenue (MRR)', 'Sarah Chen', 1000000, 'weekly', 'currency', 'greater_equal', 10
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[10] FROM new_metric;
    
    -- Metric 11: Customer Churn Rate
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Customer Churn Rate', 'David Kim', 3, 'weekly', 'percentage', 'less_equal', 11
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[11] FROM new_metric;
    
    -- Metric 12: Team Productivity Score
    WITH new_metric AS (
        INSERT INTO scorecard_metrics (
            id, organization_id, team_id, name, owner, goal, type, value_type, comparison_operator, display_order
        ) VALUES (
            gen_random_uuid(), v_org_id, v_leadership_team_id,
            'Team Productivity Score', v_ceo_first_name || ' ' || v_ceo_last_name, 80, 'weekly', 'percentage', 'greater_equal', 12
        ) RETURNING id
    )
    SELECT id INTO v_metric_ids[12] FROM new_metric;
    
    RAISE NOTICE 'Created 12 Scorecard Metrics';
    
    -- Add 13 weeks of historical data for each metric
    RAISE NOTICE 'Adding 13 weeks of historical scorecard data...';
    
    -- Weekly Revenue (trending up)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 210000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 225000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 235000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 242000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 238000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 255000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 248000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 262000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 271000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 268000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 280000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE - INTERVAL '1 week', 285000),
        (v_metric_ids[1], v_org_id, CURRENT_DATE, 292000);
    
    -- New Customers (fluctuating around goal)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 12),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 14),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 16),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 13),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 15),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 17),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 14),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 16),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 18),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 15),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 17),
        (v_metric_ids[2], v_org_id, CURRENT_DATE - INTERVAL '1 week', 16),
        (v_metric_ids[2], v_org_id, CURRENT_DATE, 19);
    
    -- Sales Pipeline (growing)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 4200000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 4350000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 4500000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 4650000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 4800000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 4900000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 5100000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 5250000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 5400000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 5500000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 5650000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE - INTERVAL '1 week', 5800000),
        (v_metric_ids[3], v_org_id, CURRENT_DATE, 5950000);
    
    -- Product Deployments (stable)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 2),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 4),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 2),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 4),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 4),
        (v_metric_ids[4], v_org_id, CURRENT_DATE - INTERVAL '1 week', 3),
        (v_metric_ids[4], v_org_id, CURRENT_DATE, 3);
    
    -- Code Quality (high and stable)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 83),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 84),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 86),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 85),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 87),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 86),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 88),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 87),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 89),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 88),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 90),
        (v_metric_ids[5], v_org_id, CURRENT_DATE - INTERVAL '1 week', 89),
        (v_metric_ids[5], v_org_id, CURRENT_DATE, 91);
    
    -- Website Visitors (growing)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 4200),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 4400),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 4600),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 4750),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 4900),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 5100),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 5250),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 5400),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 5600),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 5750),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 5900),
        (v_metric_ids[6], v_org_id, CURRENT_DATE - INTERVAL '1 week', 6100),
        (v_metric_ids[6], v_org_id, CURRENT_DATE, 6300);
    
    -- MQLs (fluctuating)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 35),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 38),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 42),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 39),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 41),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 44),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 40),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 43),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 46),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 42),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 45),
        (v_metric_ids[7], v_org_id, CURRENT_DATE - INTERVAL '1 week', 47),
        (v_metric_ids[7], v_org_id, CURRENT_DATE, 49);
    
    -- CSAT (high)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 88),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 89),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 90),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 89),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 91),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 90),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 92),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 91),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 93),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 92),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 94),
        (v_metric_ids[8], v_org_id, CURRENT_DATE - INTERVAL '1 week', 93),
        (v_metric_ids[8], v_org_id, CURRENT_DATE, 95);
    
    -- Support Resolution Time (improving)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 6.5),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 6.2),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 5.8),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 5.5),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 5.2),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 4.9),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 4.6),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 4.3),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 4.1),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 3.9),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 3.7),
        (v_metric_ids[9], v_org_id, CURRENT_DATE - INTERVAL '1 week', 3.5),
        (v_metric_ids[9], v_org_id, CURRENT_DATE, 3.3);
    
    -- MRR (growing)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 850000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 870000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 890000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 910000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 930000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 950000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 970000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 990000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 1010000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 1030000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 1050000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE - INTERVAL '1 week', 1070000),
        (v_metric_ids[10], v_org_id, CURRENT_DATE, 1090000);
    
    -- Churn Rate (improving)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 4.2),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 4.0),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 3.8),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 3.7),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 3.5),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 3.4),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 3.3),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 3.2),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 3.1),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 3.0),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 2.9),
        (v_metric_ids[11], v_org_id, CURRENT_DATE - INTERVAL '1 week', 2.8),
        (v_metric_ids[11], v_org_id, CURRENT_DATE, 2.7);
    
    -- Team Productivity (stable high)
    INSERT INTO scorecard_scores (metric_id, organization_id, week_date, value) VALUES
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '12 weeks', 78),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '11 weeks', 79),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '10 weeks', 81),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '9 weeks', 80),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '8 weeks', 82),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '7 weeks', 81),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '6 weeks', 83),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '5 weeks', 82),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '4 weeks', 84),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '3 weeks', 83),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '2 weeks', 85),
        (v_metric_ids[12], v_org_id, CURRENT_DATE - INTERVAL '1 week', 84),
        (v_metric_ids[12], v_org_id, CURRENT_DATE, 86);
    
    RAISE NOTICE 'Added 156 scorecard data points (13 weeks × 12 metrics)';

    -- ========================================================================
    -- STEP 8: CREATE TO-DOS
    -- ========================================================================
    RAISE NOTICE 'Creating To-Dos...';
    
    INSERT INTO todos (organization_id, team_id, title, assigned_to, created_by, due_date, status, priority) VALUES
        (v_org_id, v_leadership_team_id, 'Review Q4 financial projections', v_ceo_user_id, v_ceo_user_id, CURRENT_DATE + INTERVAL '3 days', 'incomplete', 'high'),
        (v_org_id, v_leadership_team_id, 'Schedule board meeting for December', v_ceo_user_id, v_ceo_user_id, CURRENT_DATE + INTERVAL '5 days', 'incomplete', 'medium'),
        (v_org_id, v_sales_team_id, 'Follow up with Enterprise prospect - Acme Corp', v_user_sarah_id, v_user_sarah_id, CURRENT_DATE + INTERVAL '1 day', 'incomplete', 'urgent'),
        (v_org_id, v_sales_team_id, 'Prepare Q4 sales forecast presentation', v_user_sarah_id, v_user_sarah_id, CURRENT_DATE + INTERVAL '7 days', 'incomplete', 'high'),
        (v_org_id, v_sales_team_id, 'Update CRM with new pipeline data', v_user_lisa_id, v_user_sarah_id, CURRENT_DATE + INTERVAL '2 days', 'incomplete', 'medium'),
        (v_org_id, v_product_team_id, 'Complete mobile app beta testing', v_user_mike_id, v_user_mike_id, CURRENT_DATE + INTERVAL '4 days', 'incomplete', 'urgent'),
        (v_org_id, v_product_team_id, 'Review AI feature specifications', v_user_tom_id, v_user_mike_id, CURRENT_DATE + INTERVAL '3 days', 'incomplete', 'high'),
        (v_org_id, v_product_team_id, 'Schedule sprint planning for next week', v_user_mike_id, v_user_mike_id, CURRENT_DATE + INTERVAL '2 days', 'incomplete', 'medium'),
        (v_org_id, v_marketing_team_id, 'Launch new email campaign', v_user_emily_id, v_user_emily_id, CURRENT_DATE + INTERVAL '1 day', 'incomplete', 'high'),
        (v_org_id, v_marketing_team_id, 'Finalize website copy for new pages', v_user_emily_id, v_user_emily_id, CURRENT_DATE + INTERVAL '5 days', 'incomplete', 'medium'),
        (v_org_id, v_cs_team_id, 'Conduct customer satisfaction survey', v_user_david_id, v_user_david_id, CURRENT_DATE + INTERVAL '6 days', 'incomplete', 'medium'),
        (v_org_id, v_cs_team_id, 'Resolve escalated support ticket #1847', v_user_rachel_id, v_user_david_id, CURRENT_DATE + INTERVAL '1 day', 'incomplete', 'urgent');
    
    RAISE NOTICE 'Created 12 To-Dos';

    -- ========================================================================
    -- STEP 9: CREATE ISSUES
    -- ========================================================================
    RAISE NOTICE 'Creating Issues...';
    
    INSERT INTO issues (organization_id, team_id, title, description, created_by, priority, priority_rank, status) VALUES
        (v_org_id, v_leadership_team_id, 'Need to hire 3 senior engineers by end of Q4', 'Talent acquisition bottleneck affecting product roadmap delivery', v_ceo_user_id, 'high', 9, 'open'),
        (v_org_id, v_leadership_team_id, 'Customer onboarding time too long (avg 2 weeks)', 'Need to streamline onboarding process to improve time-to-value', v_user_david_id, 'high', 8, 'open'),
        (v_org_id, v_sales_team_id, 'Enterprise deal cycle averaging 6 months', 'Sales cycle too long for large deals, need better qualification process', v_user_sarah_id, 'medium', 7, 'open'),
        (v_org_id, v_sales_team_id, 'Pricing model confusion in mid-market segment', 'Prospects unclear on which tier to choose, losing deals', v_user_lisa_id, 'medium', 6, 'open'),
        (v_org_id, v_product_team_id, 'Technical debt in legacy codebase slowing development', 'Need dedicated sprint to refactor core modules', v_user_mike_id, 'high', 8, 'open'),
        (v_org_id, v_product_team_id, 'Mobile app performance issues on Android devices', 'App crashes on certain Android versions, affecting user experience', v_user_tom_id, 'critical', 10, 'open'),
        (v_org_id, v_marketing_team_id, 'Website conversion rate below industry benchmark', 'Current rate 2.1%, industry avg 3.5% - need UX improvements', v_user_emily_id, 'medium', 6, 'open'),
        (v_org_id, v_marketing_team_id, 'Content marketing strategy not generating enough leads', 'Blog traffic high but lead conversion low, need better CTAs', v_user_emily_id, 'medium', 5, 'open'),
        (v_org_id, v_cs_team_id, 'Support team capacity maxed out', 'Ticket volume growing 20% monthly, need to hire or implement automation', v_user_david_id, 'high', 9, 'open'),
        (v_org_id, v_cs_team_id, 'Customer feature requests not being prioritized', 'Disconnect between CS feedback and product roadmap planning', v_user_rachel_id, 'medium', 7, 'open');
    
    RAISE NOTICE 'Created 10 Issues';

    -- ========================================================================
    -- STEP 10: CREATE HEADLINES
    -- ========================================================================
    RAISE NOTICE 'Creating Headlines...';
    
    INSERT INTO headlines (organization_id, team_id, text, type, meeting_date, created_by) VALUES
        (v_org_id, v_leadership_team_id, 'Closed largest deal in company history - $250K ACV with Fortune 500 company!', 'good', CURRENT_DATE - INTERVAL '3 days', v_user_sarah_id),
        (v_org_id, v_leadership_team_id, 'Featured in TechCrunch as "Top 10 ' || v_industry || ' Companies to Watch"', 'good', CURRENT_DATE - INTERVAL '5 days', v_user_emily_id),
        (v_org_id, v_sales_team_id, 'Sarah Chen won "Sales Leader of the Quarter" award from industry association', 'good', CURRENT_DATE - INTERVAL '7 days', v_user_sarah_id),
        (v_org_id, v_sales_team_id, 'Exceeded monthly revenue target by 18% - best month ever!', 'good', CURRENT_DATE - INTERVAL '10 days', v_user_sarah_id),
        (v_org_id, v_product_team_id, 'Mobile app beta received 4.8 star rating from test users', 'good', CURRENT_DATE - INTERVAL '4 days', v_user_mike_id),
        (v_org_id, v_product_team_id, 'Engineering team completed sprint with 100% story completion rate', 'good', CURRENT_DATE - INTERVAL '6 days', v_user_tom_id),
        (v_org_id, v_cs_team_id, 'Customer NPS score hit all-time high of 52', 'good', CURRENT_DATE - INTERVAL '2 days', v_user_david_id),
        (v_org_id, v_cs_team_id, 'Major customer (500+ users) renewed for 3-year contract', 'good', CURRENT_DATE - INTERVAL '8 days', v_user_rachel_id);
    
    RAISE NOTICE 'Created 8 Headlines';

    -- ========================================================================
    -- STEP 11: CREATE ORGANIZATIONAL CHART
    -- ========================================================================
    RAISE NOTICE 'Creating Organizational Chart...';
    
    -- Create organizational chart
    INSERT INTO organizational_charts (id, organization_id, name, description, created_by)
    VALUES (
        gen_random_uuid(),
        v_org_id,
        v_company_name || ' Organizational Chart',
        'Company-wide organizational structure and accountability chart',
        v_ceo_user_id
    ) RETURNING id INTO v_chart_id;
    
    -- Create positions
    -- Level 0: CEO
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, NULL,
        'Chief Executive Officer',
        'Overall company leadership and strategic direction',
        0, 1, 'leadership'
    ) RETURNING id INTO v_pos_ceo_id;
    
    -- Level 1: VPs reporting to CEO
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_ceo_id,
        'VP of Sales',
        'Lead revenue generation and sales team',
        1, 1, 'leadership'
    ) RETURNING id INTO v_pos_vp_sales_id;
    
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_ceo_id,
        'VP of Product & Engineering',
        'Oversee product development and technical operations',
        1, 2, 'leadership'
    ) RETURNING id INTO v_pos_vp_product_id;
    
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_ceo_id,
        'VP of Marketing',
        'Drive brand awareness and demand generation',
        1, 3, 'leadership'
    ) RETURNING id INTO v_pos_vp_marketing_id;
    
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_ceo_id,
        'VP of Customer Success',
        'Ensure customer satisfaction and retention',
        1, 4, 'leadership'
    ) RETURNING id INTO v_pos_vp_cs_id;
    
    -- Level 2: Individual contributors
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_vp_sales_id,
        'Senior Sales Representative',
        'Close new business and manage enterprise accounts',
        2, 1, 'individual_contributor'
    ) RETURNING id INTO v_pos_sales_rep_id;
    
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_vp_product_id,
        'Senior Product Manager',
        'Define product roadmap and feature specifications',
        2, 1, 'individual_contributor'
    ) RETURNING id INTO v_pos_pm_id;
    
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(), v_chart_id, v_pos_vp_cs_id,
        'Customer Support Manager',
        'Manage support team and customer escalations',
        2, 1, 'individual_contributor'
    ) RETURNING id INTO v_pos_support_id;
    
    RAISE NOTICE 'Created 8 positions in organizational chart';
    
    -- Assign users to positions
    INSERT INTO position_holders (position_id, user_id, is_primary) VALUES
        (v_pos_ceo_id, v_ceo_user_id, true),
        (v_pos_vp_sales_id, v_user_sarah_id, true),
        (v_pos_vp_product_id, v_user_mike_id, true),
        (v_pos_vp_marketing_id, v_user_emily_id, true),
        (v_pos_vp_cs_id, v_user_david_id, true),
        (v_pos_sales_rep_id, v_user_lisa_id, true),
        (v_pos_pm_id, v_user_tom_id, true),
        (v_pos_support_id, v_user_rachel_id, true);
    
    RAISE NOTICE 'Assigned all users to positions';
    
    -- Add responsibilities to positions
    INSERT INTO position_responsibilities (position_id, responsibility, priority, sort_order) VALUES
        -- CEO responsibilities
        (v_pos_ceo_id, 'Set company vision and strategic direction', 'critical', 1),
        (v_pos_ceo_id, 'Lead executive team and board communications', 'critical', 2),
        (v_pos_ceo_id, 'Drive fundraising and investor relations', 'high', 3),
        (v_pos_ceo_id, 'Build company culture and values', 'high', 4),
        
        -- VP Sales responsibilities
        (v_pos_vp_sales_id, 'Achieve quarterly and annual revenue targets', 'critical', 1),
        (v_pos_vp_sales_id, 'Build and manage high-performing sales team', 'critical', 2),
        (v_pos_vp_sales_id, 'Develop sales strategy and processes', 'high', 3),
        
        -- VP Product responsibilities
        (v_pos_vp_product_id, 'Define product vision and roadmap', 'critical', 1),
        (v_pos_vp_product_id, 'Lead engineering and product teams', 'critical', 2),
        (v_pos_vp_product_id, 'Ensure product quality and timely delivery', 'high', 3),
        
        -- VP Marketing responsibilities
        (v_pos_vp_marketing_id, 'Drive demand generation and lead flow', 'critical', 1),
        (v_pos_vp_marketing_id, 'Build brand awareness and positioning', 'high', 2),
        (v_pos_vp_marketing_id, 'Manage marketing budget and ROI', 'high', 3),
        
        -- VP CS responsibilities
        (v_pos_vp_cs_id, 'Maintain high customer satisfaction (NPS 50+)', 'critical', 1),
        (v_pos_vp_cs_id, 'Reduce churn and drive retention', 'critical', 2),
        (v_pos_vp_cs_id, 'Lead customer success and support teams', 'high', 3),
        
        -- Sales Rep responsibilities
        (v_pos_sales_rep_id, 'Close new business deals', 'critical', 1),
        (v_pos_sales_rep_id, 'Manage enterprise customer relationships', 'high', 2),
        
        -- Product Manager responsibilities
        (v_pos_pm_id, 'Define feature specifications and requirements', 'critical', 1),
        (v_pos_pm_id, 'Coordinate with engineering on delivery', 'high', 2),
        
        -- Support Manager responsibilities
        (v_pos_support_id, 'Manage support ticket queue and SLAs', 'critical', 1),
        (v_pos_support_id, 'Handle customer escalations', 'high', 2);
    
    RAISE NOTICE 'Added responsibilities to all positions';

    -- ========================================================================
    -- COMPLETION
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Demo data creation COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- 8 Users (including CEO)';
    RAISE NOTICE '- 5 Teams';
    RAISE NOTICE '- 1 Business Blueprint (VTO)';
    RAISE NOTICE '- 10 Quarterly Priorities (Rocks) with milestones';
    RAISE NOTICE '- 12 Scorecard Metrics with 13 weeks of data';
    RAISE NOTICE '- 12 To-Dos';
    RAISE NOTICE '- 10 Issues';
    RAISE NOTICE '- 8 Headlines';
    RAISE NOTICE '- 1 Organizational Chart with 8 positions';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Organization ID: %', v_org_id;
    RAISE NOTICE 'CEO User ID: %', v_ceo_user_id;
    RAISE NOTICE 'Chart ID: %', v_chart_id;
    RAISE NOTICE '========================================';

END $$;

