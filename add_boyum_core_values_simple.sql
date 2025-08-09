-- =====================================================
-- Add Core Values for Boyum Barenscheer (Simplified)
-- Stores in organization settings as JSON
-- =====================================================

BEGIN;

UPDATE organizations 
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{core_values}',
    '[
        {
            "title": "Caring & Thoughtful",
            "description": "As a caring organization, we prioritize the well-being of our team, fostering a supportive and inclusive environment. Our commitment extends to making a positive impact on the communities we serve. We approach challenges with thoughtful consideration and a focus on long-term impact. Open communication and diverse perspectives drive our innovation and responsible decision-making.",
            "order": 1
        },
        {
            "title": "Get Things Done",
            "description": "We''re all about turning plans into results, no excuses. When we commit, we deliver—taking challenges in stride and finding solutions along the way. Teamwork is our engine, and clear communication keeps us on track. In the end, it''s not just about completing tasks; it''s about owning them and celebrating the journey of achievement.",
            "order": 2
        },
        {
            "title": "Work with Purpose",
            "description": "We believe that every action we take should be intentional and aligned with our greater mission. By working with purpose, we ensure that our efforts are not just tasks completed, but meaningful contributions to our customers, our firm, and our communities. We also understand that true purpose is achieved when our professional goals are harmonized with personal well-being, allowing us to bring our best selves to both work and life.",
            "order": 3
        }
    ]'::jsonb,
    true
),
updated_at = NOW()
WHERE slug = 'boyum-barenscheer';

-- Verify the update
SELECT 
    name,
    settings->'core_values' as core_values
FROM organizations 
WHERE slug = 'boyum-barenscheer';

COMMIT;

-- To view the core values nicely formatted:
/*
SELECT 
    name as "Organization",
    jsonb_array_elements(settings->'core_values')->>'title' as "Core Value",
    jsonb_array_elements(settings->'core_values')->>'description' as "Description"
FROM organizations 
WHERE slug = 'boyum-barenscheer';
*/