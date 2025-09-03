-- Disable the automatic subscription trigger since we're handling it in application code
-- This prevents foreign key violations during registration

-- Drop the trigger that automatically creates subscriptions
DROP TRIGGER IF EXISTS start_organization_trial_trigger ON organizations;

-- Optionally, you can keep the function for manual use or drop it
-- DROP FUNCTION IF EXISTS start_organization_trial();

-- Note: Subscriptions will now be created by the application code after 
-- the organization and user are successfully created