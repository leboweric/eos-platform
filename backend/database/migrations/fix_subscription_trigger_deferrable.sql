-- Fix the subscription trigger to be deferrable so it runs at transaction commit
-- This prevents foreign key violations when the transaction is rolled back

-- First, drop the existing trigger
DROP TRIGGER IF EXISTS start_organization_trial_trigger ON organizations;

-- Recreate the trigger as DEFERRABLE INITIALLY DEFERRED
-- This means it will only execute when the transaction commits successfully
CREATE CONSTRAINT TRIGGER start_organization_trial_trigger
  AFTER INSERT ON organizations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION start_organization_trial();

-- Alternative solution: Move subscription creation to the application code
-- If the above doesn't work, we should consider removing the trigger entirely
-- and creating the subscription in the authController.js after the transaction commits