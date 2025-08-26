-- Update price_per_user to the correct monthly equivalent for annual billing
-- $3350/year ÷ 12 months = $279.17/month
UPDATE subscriptions 
SET price_per_user = 279.17
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';

-- Verify the update
SELECT 
    organization_id,
    billing_interval,
    current_period_end,
    price_per_user
FROM subscriptions 
WHERE organization_id = '98b2f3ef-2e46-4120-aa05-851ca73ef755';