-- IMPORT EMAILS FROM APOLLO CSV EXPORT

-- If you have the apollo.csv with 160 enriched contacts, you can import them

-- 1. First, create a temporary table to hold the CSV data
CREATE TEMP TABLE apollo_import (
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    company_name VARCHAR(255),
    title VARCHAR(200),
    phone VARCHAR(50)
);

-- 2. Import the CSV (update the path to your apollo.csv file)
-- In pgAdmin, you can use Import/Export wizard or:
-- COPY apollo_import FROM '/path/to/apollo.csv' WITH CSV HEADER;

-- 3. Update contacts with emails from Apollo CSV
UPDATE prospect_contacts pc
SET 
    email = ai.email,
    phone = COALESCE(ai.phone, pc.phone),
    last_updated = NOW()
FROM apollo_import ai
JOIN prospects p ON pc.prospect_id = p.id
WHERE pc.first_name = ai.first_name
    AND pc.last_name = ai.last_name
    AND p.company_name = ai.company_name
    AND pc.email IS NULL
    AND ai.email IS NOT NULL;

-- 4. Check how many were updated
SELECT 
    COUNT(*) as contacts_updated
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
    AND pc.last_updated > NOW() - INTERVAL '5 minutes';

-- 5. Alternative: If names don't match exactly, use fuzzy matching
UPDATE prospect_contacts pc
SET 
    email = ai.email,
    phone = COALESCE(ai.phone, pc.phone),
    last_updated = NOW()
FROM apollo_import ai
JOIN prospects p ON pc.prospect_id = p.id
WHERE LOWER(pc.first_name) = LOWER(ai.first_name)
    AND LOWER(pc.last_name) = LOWER(ai.last_name)
    AND pc.email IS NULL
    AND ai.email IS NOT NULL;

-- 6. Final check
SELECT 
    COUNT(*) as total_contacts,
    COUNT(email) as with_email,
    ROUND(COUNT(email)::numeric / COUNT(*)::numeric * 100, 1) as percent_with_email
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true;