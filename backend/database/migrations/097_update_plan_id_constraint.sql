-- Up
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_id_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_check CHECK (plan_id IN ('starter', 'growth', 'scale', 'enterprise', 'custom', 'pro'));

-- Down
ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_id_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_id_check CHECK (plan_id IN ('starter', 'growth', 'scale', 'enterprise', 'pro'));
