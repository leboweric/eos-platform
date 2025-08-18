-- Update subscriptions table to support no-credit-card trials
-- Make Stripe fields nullable since they won't exist until user adds payment method

-- Make stripe fields nullable for free trials
ALTER TABLE subscriptions 
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_payment_method_id DROP NOT NULL;

-- Add fields for better trial management
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_type VARCHAR(20) DEFAULT 'free' CHECK (trial_type IN ('free', 'paid')),
  ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_reminder_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS features_limited BOOLEAN DEFAULT FALSE;

-- Add trial_started_at to organizations for easy checking
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'starter', 'growth', 'scale', 'enterprise'));

-- Create function to automatically start trial on organization creation
CREATE OR REPLACE FUNCTION start_organization_trial()
RETURNS TRIGGER AS $$
BEGIN
  -- Set trial dates on organization
  NEW.trial_started_at = NOW();
  NEW.trial_ends_at = NOW() + INTERVAL '30 days';
  NEW.subscription_tier = 'trial';
  NEW.has_active_subscription = true;
  
  -- Create subscription record for trial
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
    (SELECT email FROM users WHERE organization_id = NEW.id LIMIT 1),
    1,
    0  -- Free during trial
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_start_trial ON organizations;

-- Create trigger for new organizations
CREATE TRIGGER auto_start_trial
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION start_organization_trial();

-- Update existing organizations without trials
UPDATE organizations o
SET 
  trial_started_at = COALESCE(
    (SELECT trial_start_date FROM subscriptions WHERE organization_id = o.id),
    o.created_at
  ),
  trial_ends_at = COALESCE(
    (SELECT trial_end_date FROM subscriptions WHERE organization_id = o.id),
    o.created_at + INTERVAL '30 days'
  ),
  subscription_tier = CASE 
    WHEN EXISTS (SELECT 1 FROM subscriptions WHERE organization_id = o.id AND status = 'active') THEN 'growth'
    WHEN EXISTS (SELECT 1 FROM subscriptions WHERE organization_id = o.id AND status = 'trialing') THEN 'trial'
    ELSE 'trial'
  END
WHERE trial_started_at IS NULL;

-- Create or update subscriptions for organizations that don't have them
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
)
SELECT 
  o.id,
  'trialing',
  'pro',
  'free',
  COALESCE(o.created_at, NOW()),
  COALESCE(o.created_at + INTERVAL '30 days', NOW() + INTERVAL '30 days'),
  (SELECT email FROM users WHERE organization_id = o.id AND role = 'admin' LIMIT 1),
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id),
  0
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.organization_id = o.id
)
ON CONFLICT (organization_id) DO NOTHING;

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends_at ON organizations(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_type ON subscriptions(trial_type);