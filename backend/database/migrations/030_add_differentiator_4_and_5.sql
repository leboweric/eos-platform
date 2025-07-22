-- Add support for 4th and 5th differentiators in marketing strategies
ALTER TABLE marketing_strategies
ADD COLUMN differentiator_4 TEXT,
ADD COLUMN differentiator_5 TEXT;