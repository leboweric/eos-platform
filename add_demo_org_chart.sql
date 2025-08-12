-- =====================================================
-- ADD ORGANIZATIONAL CHART FOR DEMO ORGANIZATION
-- =====================================================

-- Create the main organizational chart
INSERT INTO organizational_charts (
    id, organization_id, name, description, created_by, is_template
)
VALUES (
    'deeeeeee-5555-0000-0000-000000000001',
    'deeeeeee-0000-0000-0000-000000000001',
    'Acme Industries Organizational Chart',
    'Company organizational structure for Acme Industries',
    'deeeeeee-2222-0000-0000-000000000001',
    false
);

-- Add positions (seats) in the org chart
DO $$
DECLARE
    v_ceo_position UUID;
    v_coo_position UUID;
    v_cfo_position UUID;
    v_vp_sales_position UUID;
    v_vp_marketing_position UUID;
    v_vp_operations_position UUID;
    v_dir_finance_position UUID;
    v_dir_hr_position UUID;
BEGIN
    -- CEO Position (Top Level)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        NULL,
        'Chief Executive Officer',
        'Leads the company vision and strategy',
        0,
        1,
        'leadership'
    ) RETURNING id INTO v_ceo_position;
    
    -- COO Position (Reports to CEO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_ceo_position,
        'Chief Operating Officer',
        'Oversees daily operations and execution',
        1,
        1,
        'leadership'
    ) RETURNING id INTO v_coo_position;
    
    -- CFO Position (Reports to CEO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_ceo_position,
        'Chief Financial Officer',
        'Manages financial planning and risk',
        1,
        2,
        'leadership'
    ) RETURNING id INTO v_cfo_position;
    
    -- VP Sales (Reports to CEO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_ceo_position,
        'VP of Sales',
        'Leads sales strategy and team',
        1,
        3,
        'leadership'
    ) RETURNING id INTO v_vp_sales_position;
    
    -- VP Marketing (Reports to CEO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_ceo_position,
        'VP of Marketing',
        'Drives marketing and brand strategy',
        1,
        4,
        'leadership'
    ) RETURNING id INTO v_vp_marketing_position;
    
    -- VP Operations (Reports to COO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_coo_position,
        'VP of Operations',
        'Manages production and delivery operations',
        2,
        1,
        'management'
    ) RETURNING id INTO v_vp_operations_position;
    
    -- Director of Finance (Reports to CFO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_cfo_position,
        'Director of Finance',
        'Manages accounting and financial reporting',
        2,
        1,
        'management'
    ) RETURNING id INTO v_dir_finance_position;
    
    -- Director of HR (Reports to COO)
    INSERT INTO positions (id, chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES (
        gen_random_uuid(),
        'deeeeeee-5555-0000-0000-000000000001',
        v_coo_position,
        'Director of Human Resources',
        'Leads talent acquisition and development',
        2,
        2,
        'management'
    ) RETURNING id INTO v_dir_hr_position;
    
    -- Add additional positions under departments
    
    -- Sales Team positions (under VP Sales)
    INSERT INTO positions (chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES 
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_sales_position, 'Sales Manager - Enterprise', 'Manages enterprise sales team', 2, 1, 'management'),
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_sales_position, 'Sales Manager - SMB', 'Manages SMB sales team', 2, 2, 'management'),
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_sales_position, 'Customer Success Manager', 'Ensures customer satisfaction and retention', 2, 3, 'management');
    
    -- Marketing Team positions (under VP Marketing)
    INSERT INTO positions (chart_id, parent_position_id, title, description, level, sort_order, position_type)
    VALUES 
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_marketing_position, 'Marketing Manager', 'Manages marketing campaigns', 2, 1, 'management'),
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_marketing_position, 'Product Marketing Manager', 'Handles product positioning and messaging', 2, 2, 'management'),
        ('deeeeeee-5555-0000-0000-000000000001', v_vp_marketing_position, 'Digital Marketing Specialist', 'Manages digital channels', 3, 3, 'individual_contributor');
    
    -- Now assign people to positions
    -- Assign CEO
    INSERT INTO position_holders (position_id, user_id, start_date, is_primary)
    VALUES (v_ceo_position, 'deeeeeee-2222-0000-0000-000000000001', '2020-01-01', true);
    
    -- Assign COO
    INSERT INTO position_holders (position_id, user_id, start_date, is_primary)
    VALUES (v_coo_position, 'deeeeeee-2222-0000-0000-000000000002', '2020-01-01', true);
    
    -- Assign CFO
    INSERT INTO position_holders (position_id, user_id, start_date, is_primary)
    VALUES (v_cfo_position, 'deeeeeee-2222-0000-0000-000000000003', '2021-03-01', true);
    
    -- Assign VP Sales
    INSERT INTO position_holders (position_id, user_id, start_date, is_primary)
    VALUES (v_vp_sales_position, 'deeeeeee-2222-0000-0000-000000000004', '2020-06-01', true);
    
    -- Assign VP Marketing
    INSERT INTO position_holders (position_id, user_id, start_date, is_primary)
    VALUES (v_vp_marketing_position, 'deeeeeee-2222-0000-0000-000000000005', '2021-01-01', true);
    
    -- Add some external/placeholder positions
    INSERT INTO position_holders (position_id, external_name, external_email, start_date, is_primary)
    VALUES 
        (v_vp_operations_position, 'To Be Hired', 'recruiting@acme.com', NULL, true),
        (v_dir_hr_position, 'Jennifer Wilson', 'jwilson@acme.com', '2022-05-01', true);
    
END $$;

-- Verify the org chart was created
SELECT 
    'Org Chart Structure:' as info,
    p.title,
    p.level,
    p.position_type,
    COALESCE(u.first_name || ' ' || u.last_name, ph.external_name) as holder_name
FROM positions p
LEFT JOIN position_holders ph ON p.id = ph.position_id AND ph.is_primary = true
LEFT JOIN users u ON ph.user_id = u.id
WHERE p.chart_id = 'deeeeeee-5555-0000-0000-000000000001'
ORDER BY p.level, p.sort_order;