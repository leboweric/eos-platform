-- Add comments to profit columns to indicate they store percentage values
COMMENT ON COLUMN quarterly_predictions.profit_target IS 'Target profit margin as a percentage (e.g., 15.5 for 15.5%)';
COMMENT ON COLUMN quarterly_predictions.profit_current IS 'Current profit margin as a percentage (e.g., 12.3 for 12.3%)';