-- Check what tables exist in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%blueprint%' 
    OR table_name LIKE '%vto%' 
    OR table_name LIKE '%core%'
    OR table_name = 'quarterly_priorities'
    OR table_name = 'rocks'
)
ORDER BY table_name;