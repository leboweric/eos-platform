-- ADD MISSING COLUMNS FOR APOLLO ENRICHMENT
-- Run this in pgAdmin to add the columns needed for enrichment

-- 1. Check which columns are missing
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'prospects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns for Apollo enrichment
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS technologies_used JSONB;

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS growth_rate DECIMAL(5,2);

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS recent_funding JSONB;

-- 3. Verify columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'prospects' 
AND column_name IN ('technologies_used', 'growth_rate', 'recent_funding')
ORDER BY column_name;

-- 4. Check the full table structure
\d prospects