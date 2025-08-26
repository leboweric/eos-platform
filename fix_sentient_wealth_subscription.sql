-- Fix Sentient Wealth subscription to reflect annual billing
-- Organization ID: 98b2f3ef-2e46-4120-aa05-851ca73ef755

-- Update subscription to annual billing
-- Growth plan is $349/month or $3350/year (flat rate, not per user)
-- For annual billing, price_per_user should be the monthly equivalent: $3350/12 = $279.17
UPDATE subscriptions 
SET billing_interval = 'annual',
    current_period_end = '2026-08-25 14:13:41.642+00'::timestamptz,
    price_per_user = 279.17
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- Verify the update
SELECT 
    organization_id,
    billing_interval,
    current_period_start,
    current_period_end,
    price_per_user,
    stripe_subscription_id
FROM subscriptions 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';