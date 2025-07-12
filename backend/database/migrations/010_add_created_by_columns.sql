-- Add created_by column to quarterly_priorities table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'quarterly_priorities' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE quarterly_priorities 
        ADD COLUMN created_by UUID REFERENCES users(id);
        
        -- Set a default value for existing rows (you can update this to a specific user ID)
        -- UPDATE quarterly_priorities SET created_by = owner_id WHERE created_by IS NULL;
    END IF;
END $$;

-- Add index for created_by column
CREATE INDEX IF NOT EXISTS idx_quarterly_priorities_created_by 
ON quarterly_priorities(created_by);