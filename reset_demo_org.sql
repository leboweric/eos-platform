-- =====================================================
-- RESET DEMO ORGANIZATION TO ORIGINAL STATE
-- =====================================================
-- This script completely resets the demo org to its pristine state
-- Run this manually or via a scheduled job (cron/Railway)

BEGIN;

-- 1. Delete the existing demo org completely (cascades to all related data)
DELETE FROM organizations WHERE slug = 'demo-acme-industries';

-- 2. Re-run the original setup script
-- You would include the full content of create_demo_org.sql here
-- Or call it as a separate script

COMMIT;

-- For a complete reset, run these scripts in order:
-- 1. This reset script (deletes everything)
-- 2. create_demo_org.sql (recreates everything)
-- 3. fix_company_rocks_flag.sql (sets company rock flags)
-- 4. adjust_company_rocks.sql (adjusts which are company vs individual)
-- 5. add_acme_logo.sql (adds the logo)