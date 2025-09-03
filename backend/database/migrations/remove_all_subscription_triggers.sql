-- Remove ALL triggers that might be calling start_organization_trial()
-- The error shows the trigger is still running despite our attempt to drop it

-- First, list all triggers on the organizations table to see what's there
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'organizations'::regclass
AND tgisinternal = FALSE;

-- Drop any trigger that might be calling start_organization_trial
-- There might be multiple triggers with different names
DROP TRIGGER IF EXISTS start_organization_trial_trigger ON organizations;
DROP TRIGGER IF EXISTS start_trial_on_org_creation ON organizations;
DROP TRIGGER IF EXISTS create_subscription_on_org_insert ON organizations;
DROP TRIGGER IF EXISTS after_organization_insert ON organizations;

-- Check if there are any other triggers
-- You may need to drop additional ones based on what the SELECT query above shows

-- Also drop the constraint trigger version if it exists
DROP TRIGGER IF EXISTS start_organization_trial_trigger ON organizations CASCADE;

-- Now drop the function itself to ensure it can't be called
DROP FUNCTION IF EXISTS start_organization_trial() CASCADE;

-- Verify no triggers remain on organizations table
SELECT 
    'Still has trigger: ' || tgname AS remaining_triggers
FROM pg_trigger 
WHERE tgrelid = 'organizations'::regclass
AND tgisinternal = FALSE;