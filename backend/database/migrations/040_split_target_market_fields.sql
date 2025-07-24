-- Split target_market into demographic, geographic, and psychographic fields
ALTER TABLE marketing_strategies
ADD COLUMN IF NOT EXISTS demographic_profile TEXT,
ADD COLUMN IF NOT EXISTS geographic_profile TEXT,
ADD COLUMN IF NOT EXISTS psychographic_profile TEXT;

-- Migrate existing target_market data to demographic_profile as a starting point
UPDATE marketing_strategies
SET demographic_profile = target_market
WHERE target_market IS NOT NULL 
  AND target_market != ''
  AND demographic_profile IS NULL;

-- Add comments for clarity
COMMENT ON COLUMN marketing_strategies.demographic_profile IS 'Demographic characteristics of the target market (age, income, education, etc.)';
COMMENT ON COLUMN marketing_strategies.geographic_profile IS 'Geographic characteristics of the target market (location, region, urban/rural, etc.)';
COMMENT ON COLUMN marketing_strategies.psychographic_profile IS 'Psychographic characteristics of the target market (lifestyle, values, interests, etc.)';

-- Note: We keep the original target_market column for backward compatibility
-- It can be dropped in a future migration after ensuring all code is updated