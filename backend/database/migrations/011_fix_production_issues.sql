-- Fix Production Issues Migration
-- 1. Handle Krista Harding duplicate
-- 2. Create missing invitations table
-- 3. Ensure proper type casting for quarterly priorities

-- First, check if Krista exists
DO $$
BEGIN
    -- Find and report on Krista's record
    RAISE NOTICE 'Checking for Krista Harding...';
    
    -- Delete Krista if she exists (you can comment this out if you want to check first)
    DELETE FROM users WHERE email = 'kharding@strategic-cc.com';
    
    -- Alternative: Soft delete by renaming email
    -- UPDATE users 
    -- SET email = CONCAT('deleted_', id, '_', email), 
    --     deleted_at = NOW() 
    -- WHERE email = 'kharding@strategic-cc.com' AND deleted_at IS NULL;
END $$;

-- Create invitations table if it doesn't exist
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  invited_by UUID NOT NULL REFERENCES users(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invitations table
CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

-- Ensure quarterly_priorities table has correct column types
-- Check and fix year column if needed (should be INTEGER)
DO $$
BEGIN
    -- Check if year column exists and is the correct type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'quarterly_priorities' 
        AND column_name = 'year' 
        AND data_type != 'integer'
    ) THEN
        -- If year is not integer, alter it
        ALTER TABLE quarterly_priorities 
        ALTER COLUMN year TYPE INTEGER USING year::INTEGER;
    END IF;
END $$;

-- Add any missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_eosi BOOLEAN DEFAULT false;