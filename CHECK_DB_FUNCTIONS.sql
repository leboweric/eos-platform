-- Check if there are any database functions that might be transforming the query
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosrc LIKE '%t_1%' 
   OR p.prosrc LIKE '%meeting_snapshots%'
   OR p.proname LIKE '%meeting%';

-- Check if there are any triggers on the meeting_snapshots table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'meeting_snapshots';

-- Check if there are any rules on the table
SELECT 
  schemaname,
  tablename,
  rulename,
  definition
FROM pg_rules
WHERE tablename = 'meeting_snapshots';

-- Check column names to see if any contain t_1 or similar
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'meeting_snapshots'
  AND (column_name LIKE '%t_1%' OR column_name LIKE '%t1%');

-- Check if there's a view with the same name that might be intercepting queries
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'meeting_snapshots';