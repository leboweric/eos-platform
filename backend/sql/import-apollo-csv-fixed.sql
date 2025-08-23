-- IMPORT EMAILS FROM APOLLO CSV EXPORT (FIXED VERSION)

-- 1. First, create a temporary table to hold the CSV data
CREATE TEMP TABLE apollo_import (
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    company_name VARCHAR(255),
    title VARCHAR(200),
    phone VARCHAR(50)
);

-- 2. Import the CSV using pgAdmin's Import wizard
-- Or use: COPY apollo_import FROM '/path/to/apollo.csv' WITH CSV HEADER;

-- 3. Check what we imported
SELECT COUNT(*) as imported_records FROM apollo_import;
SELECT * FROM apollo_import LIMIT 5;

-- 4. Update contacts with emails from Apollo CSV (FIXED)
WITH matched_contacts AS (
    SELECT 
        pc.id as contact_id,
        ai.email as new_email,
        ai.phone as new_phone
    FROM prospect_contacts pc
    JOIN prospects p ON pc.prospect_id = p.id
    JOIN apollo_import ai ON 
        LOWER(TRIM(pc.first_name)) = LOWER(TRIM(ai.first_name))
        AND LOWER(TRIM(pc.last_name)) = LOWER(TRIM(ai.last_name))
    WHERE pc.email IS NULL
        AND ai.email IS NOT NULL
)
UPDATE prospect_contacts
SET 
    email = matched_contacts.new_email,
    phone = COALESCE(matched_contacts.new_phone, prospect_contacts.phone),
    last_updated = NOW()
FROM matched_contacts
WHERE prospect_contacts.id = matched_contacts.contact_id;

-- 5. Check how many were updated
SELECT 
    COUNT(*) as contacts_updated
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
    AND pc.last_updated > NOW() - INTERVAL '5 minutes';

-- 6. Alternative: More flexible matching (by name only, ignoring company)
WITH fuzzy_matched AS (
    SELECT 
        pc.id as contact_id,
        ai.email as new_email,
        ai.phone as new_phone,
        ai.first_name,
        ai.last_name
    FROM prospect_contacts pc
    JOIN prospects p ON pc.prospect_id = p.id
    CROSS JOIN apollo_import ai
    WHERE LOWER(TRIM(pc.first_name)) = LOWER(TRIM(ai.first_name))
        AND LOWER(TRIM(pc.last_name)) = LOWER(TRIM(ai.last_name))
        AND pc.email IS NULL
        AND ai.email IS NOT NULL
)
UPDATE prospect_contacts
SET 
    email = fuzzy_matched.new_email,
    phone = COALESCE(fuzzy_matched.new_phone, prospect_contacts.phone),
    last_updated = NOW()
FROM fuzzy_matched
WHERE prospect_contacts.id = fuzzy_matched.contact_id;

-- 7. Final check - how many contacts now have emails
SELECT 
    COUNT(*) as total_eos_contacts,
    COUNT(email) as with_email,
    COUNT(*) - COUNT(email) as still_need_email,
    ROUND(COUNT(email)::numeric / COUNT(*)::numeric * 100, 1) as percent_with_email
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true;

-- 8. See which contacts got updated
SELECT 
    p.company_name,
    pc.first_name || ' ' || pc.last_name as contact,
    pc.email,
    pc.title
FROM prospect_contacts pc
JOIN prospects p ON pc.prospect_id = p.id
WHERE p.has_eos_titles = true
    AND pc.email IS NOT NULL
    AND pc.last_updated > NOW() - INTERVAL '10 minutes'
ORDER BY pc.last_updated DESC
LIMIT 20;