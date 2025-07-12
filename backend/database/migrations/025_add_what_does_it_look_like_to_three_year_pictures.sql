-- Add what_does_it_look_like column to three_year_pictures table
ALTER TABLE three_year_pictures 
ADD COLUMN IF NOT EXISTS what_does_it_look_like TEXT;

-- Add comment
COMMENT ON COLUMN three_year_pictures.what_does_it_look_like IS 'JSON array of attributes describing what the organization looks like in 3 years';