-- Fix billing_email constraint issue during registration
-- The trigger fires before users are created, so billing_email is null

-- Step 1: Make billing_email nullable
ALTER TABLE subscriptions ALTER COLUMN billing_email DROP NOT NULL;

-- Step 2: Update the trigger to handle null billing_email gracefully
-- The trigger function should be updated to set billing_email to null initially
-- and we'll update it after the user is created

CREATE OR REPLACE FUNCTION start_organization_trial() RETURNS TRIGGER AS $$
BEGIN
  -- Insert subscription with null billing_email initially
  -- It will be updated after the first user is created
  INSERT INTO subscriptions (
    organization_id,
    status,
    plan_id,
    trial_type,
    trial_start_date,
    trial_end_date,
    billing_email,
    user_count,
    price_per_user
  ) VALUES (
    NEW.id,
    'trialing',
    'pro',
    'free',
    NOW(),
    NOW() + INTERVAL '30 days',
    NULL,  -- Set to NULL initially, will be updated when user is created
    1,
    0  -- Free during trial
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create a trigger to update billing_email when the first admin user is created
CREATE OR REPLACE FUNCTION update_subscription_billing_email() RETURNS TRIGGER AS $$
BEGIN
  -- Only update if this is an admin user and billing_email is null
  IF NEW.role = 'admin' THEN
    UPDATE subscriptions 
    SET billing_email = NEW.email 
    WHERE organization_id = NEW.organization_id 
    AND billing_email IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_billing_email_on_user_create ON users;

-- Create trigger for updating billing_email
CREATE TRIGGER update_billing_email_on_user_create
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_billing_email();

-- Update any existing subscriptions that have null billing_email
UPDATE subscriptions s
SET billing_email = (
  SELECT email 
  FROM users u 
  WHERE u.organization_id = s.organization_id 
  AND u.role = 'admin' 
  ORDER BY u.created_at 
  LIMIT 1
)
WHERE billing_email IS NULL;