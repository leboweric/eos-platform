-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  stripe_subscription_item_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  plan_id VARCHAR(50) NOT NULL DEFAULT 'pro' CHECK (plan_id IN ('pro', 'enterprise')),
  user_count INTEGER NOT NULL DEFAULT 1 CHECK (user_count >= 1),
  price_per_user DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  last_reminder_sent VARCHAR(20) CHECK (last_reminder_sent IN ('7_days', '3_days', '1_day', 'trial_ended')),
  billing_email VARCHAR(255) NOT NULL,
  last_payment_status VARCHAR(50),
  last_payment_amount DECIMAL(10,2),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Create indexes
CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status_trial_end ON subscriptions(status, trial_end_date);

-- Add has_active_subscription column to organizations if it doesn't exist
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS has_active_subscription BOOLEAN DEFAULT FALSE;