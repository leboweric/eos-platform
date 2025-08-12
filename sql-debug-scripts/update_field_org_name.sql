-- Update organization name from "Field Outdoor Services" to "Field Outdoor Spaces"
-- First, let's verify the organization exists and get its ID
SELECT id, name, slug 
FROM organizations 
WHERE name = 'Field Outdoor Services' OR name LIKE '%Field Outdoor%';

-- Update the organization name
UPDATE organizations 
SET 
    name = 'Field Outdoor Spaces',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Field Outdoor Services';

-- Verify the update
SELECT id, name, slug, updated_at 
FROM organizations 
WHERE name = 'Field Outdoor Spaces';

-- Note: The slug will remain the same unless you also want to update it
-- If you want to update the slug as well, uncomment the following:
/*
UPDATE organizations 
SET 
    slug = 'field-outdoor-spaces',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Field Outdoor Spaces';
*/