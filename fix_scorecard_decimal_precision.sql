-- Fix scorecard_metrics and scorecard_scores to support larger values
-- The current DECIMAL(10,2) only supports up to 99,999,999.99
-- We need to support values like 150,000,000+ for AUM metrics

-- Alter scorecard_metrics goal column to support larger values
ALTER TABLE scorecard_metrics 
ALTER COLUMN goal TYPE DECIMAL(20, 2);

-- Alter scorecard_scores value column to support larger values  
ALTER TABLE scorecard_scores
ALTER COLUMN value TYPE DECIMAL(20, 2);

-- This allows values up to 999,999,999,999,999,999.99 (18 digits before decimal, 2 after)