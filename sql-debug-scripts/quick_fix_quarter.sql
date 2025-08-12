-- Quick fix: Change priorities from Q3 2025 to Q1 2025 so Dashboard can see them

-- Update all Q3 2025 priorities to Q1 2025
UPDATE quarterly_priorities
SET quarter = 'Q1'
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND quarter = 'Q3'
  AND year = 2025
  AND deleted_at IS NULL;

-- Verify the update
SELECT 
    quarter,
    year,
    COUNT(*) as total_priorities,
    SUM(CASE WHEN is_company_priority = true THEN 1 ELSE 0 END) as company_priorities,
    SUM(CASE WHEN owner_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_priorities
FROM quarterly_priorities
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'Skykit')
  AND deleted_at IS NULL
GROUP BY quarter, year
ORDER BY year DESC, quarter;