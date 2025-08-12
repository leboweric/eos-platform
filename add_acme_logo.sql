-- Add ACME logo to demo organization
-- This adds an SVG logo directly as binary data

UPDATE organizations 
SET 
  logo_data = CAST(
    '<svg width="200" height="60" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
  <!-- Orange background with rounded corners -->
  <rect x="5" y="5" width="190" height="50" rx="8" ry="8" fill="#FB923C"/>
  
  <!-- White shadow/border effect -->
  <rect x="7" y="7" width="186" height="46" rx="6" ry="6" fill="#FED7AA" opacity="0.3"/>
  
  <!-- ACME text in bold white -->
  <text x="100" y="38" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">
    ACME
  </text>
  
  <!-- Subtitle -->
  <text x="100" y="48" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" opacity="0.9">
    INDUSTRIES
  </text>
  
  <!-- Small decorative element -->
  <circle cx="20" cy="30" r="3" fill="white" opacity="0.7"/>
  <circle cx="180" cy="30" r="3" fill="white" opacity="0.7"/>
</svg>' AS bytea),
  logo_mime_type = 'image/svg+xml',
  logo_updated_at = NOW()
WHERE slug = 'demo-acme-industries';

-- Verify the logo was added
SELECT 
  name,
  CASE 
    WHEN logo_data IS NOT NULL THEN 'Logo added successfully'
    ELSE 'Logo not added'
  END as logo_status,
  logo_mime_type
FROM organizations 
WHERE slug = 'demo-acme-industries';