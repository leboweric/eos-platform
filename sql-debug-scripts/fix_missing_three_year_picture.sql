-- Fix missing three_year_picture for Field Outdoor Spaces

-- First, get the VTO ID for the org-level business blueprint
WITH vto_info AS (
    SELECT id as vto_id
    FROM business_blueprints
    WHERE organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
      AND team_id IS NULL
    LIMIT 1
)
-- Check if three_year_picture exists
SELECT 'Current three_year_picture:' as status, 
       tp.*
FROM vto_info vi
LEFT JOIN three_year_pictures tp ON tp.vto_id = vi.vto_id;

-- Insert missing three_year_picture if it doesn't exist
INSERT INTO three_year_pictures (
    id,
    vto_id,
    future_date,
    revenue,
    profit,
    measurables,
    what_does_it_look_like,
    what_does_it_look_like_completions,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    bb.id,
    (CURRENT_DATE + INTERVAL '3 years')::DATE,
    NULL, -- or set default revenue
    NULL, -- or set default profit
    '[]'::jsonb, -- empty measurables array
    '[]'::jsonb, -- empty what_does_it_look_like array
    '{}'::jsonb, -- empty completions object
    NOW(),
    NOW()
FROM business_blueprints bb
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM three_year_pictures tp 
      WHERE tp.vto_id = bb.id
  );

-- Verify it was created
SELECT 'After fix - three_year_picture:' as status,
       tp.id, tp.vto_id, tp.future_date, 
       tp.what_does_it_look_like,
       tp.what_does_it_look_like_completions,
       bb.organization_id, bb.team_id
FROM three_year_pictures tp
JOIN business_blueprints bb ON bb.id = tp.vto_id
WHERE bb.organization_id = 'd6ed108e-887d-4b4c-8985-be4a3c706492'
  AND bb.team_id IS NULL;