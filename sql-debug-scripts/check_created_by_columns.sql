-- Check which tables have created_by columns

-- Check quarterly_priorities columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'quarterly_priorities' 
AND column_name LIKE '%created%' OR column_name LIKE '%owner%'
ORDER BY column_name;

-- Check scorecard_metrics columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'scorecard_metrics' 
ORDER BY column_name;

-- Check issues columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'issues' 
AND column_name LIKE '%created%' OR column_name LIKE '%owner%'
ORDER BY column_name;

-- Check todos columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'todos' 
AND column_name LIKE '%created%' OR column_name LIKE '%assigned%'
ORDER BY column_name;