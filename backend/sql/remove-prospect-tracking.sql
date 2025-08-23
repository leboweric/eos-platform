-- REMOVE PROSPECT TRACKING SYSTEM
-- Run this in pgAdmin to cleanly remove all prospect-related tables and functions

-- 1. Drop all prospect-related tables (CASCADE will handle foreign keys)
DROP TABLE IF EXISTS prospect_outreach CASCADE;
DROP TABLE IF EXISTS prospect_daily_summary CASCADE;
DROP TABLE IF EXISTS competitor_reviews CASCADE;
DROP TABLE IF EXISTS prospect_signals CASCADE;
DROP TABLE IF EXISTS prospect_contacts CASCADE;
DROP TABLE IF EXISTS prospects CASCADE;

-- 2. Drop the scoring function
DROP FUNCTION IF EXISTS calculate_prospect_score(UUID);

-- 3. Verify removal
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'prospect%';

-- Should return 0 rows