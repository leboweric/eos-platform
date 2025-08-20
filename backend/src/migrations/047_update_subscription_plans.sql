-- Update subscriptions table to support flat-rate pricing plans
-- Remove old check constraint and add new one with all plan types

-- First, drop the existing check constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;

-- Add new check constraint with flat-rate plans
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_plan_id_check 
CHECK (plan_id IN ('pro', 'enterprise', 'starter', 'growth', 'scale'));

-- Update default plan_id to 'starter' for new subscriptions
ALTER TABLE subscriptions 
ALTER COLUMN plan_id SET DEFAULT 'starter';

-- Add billing_interval column to track monthly vs annual
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'monthly' 
CHECK (billing_interval IN ('monthly', 'annual'));

-- Add discount information columns
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER,
ADD COLUMN IF NOT EXISTS discount_end_date TIMESTAMP WITH TIME ZONE;

-- Update existing 'pro' subscriptions to 'growth' (closest equivalent)
UPDATE subscriptions 
SET plan_id = 'growth' 
WHERE plan_id = 'pro';

-- Update existing 'enterprise' subscriptions remain as 'enterprise'
-- No action needed as 'enterprise' is valid in both old and new systems

-- Add index for billing queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_interval 
ON subscriptions(billing_interval);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
ON subscriptions(plan_id);