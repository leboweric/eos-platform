-- Add completion tracking for 3-Year Picture items
-- Store as JSON object mapping indices to completion status
ALTER TABLE three_year_pictures 
ADD COLUMN IF NOT EXISTS what_does_it_look_like_completions JSONB DEFAULT '{}'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN three_year_pictures.what_does_it_look_like_completions IS 'JSON object mapping item indices to completion status';