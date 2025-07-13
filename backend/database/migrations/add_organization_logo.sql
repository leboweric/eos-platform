-- Add logo support for organizations
-- This allows organizations to upload and display their company logo

-- Add logo URL column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add logo data column for storing logo as binary data (optional, for smaller logos)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_data BYTEA;

-- Add logo metadata
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_mime_type VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMP DEFAULT NOW();

-- Create an index on logo_updated_at for caching purposes
CREATE INDEX IF NOT EXISTS idx_organizations_logo_updated ON organizations(logo_updated_at);