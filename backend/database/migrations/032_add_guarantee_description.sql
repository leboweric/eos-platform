-- Add guarantee_description column to marketing_strategies table
ALTER TABLE marketing_strategies
ADD COLUMN IF NOT EXISTS guarantee_description TEXT;

-- Comment on the new column
COMMENT ON COLUMN marketing_strategies.guarantee_description IS 'Description of the guarantee offered by the organization';