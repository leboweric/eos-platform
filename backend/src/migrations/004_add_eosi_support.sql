-- Add EOSI support to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_eosi BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS eosi_email VARCHAR(255);

-- Create index for EOSI email
CREATE INDEX IF NOT EXISTS idx_users_eosi_email ON users(eosi_email);

-- Create EOSI organizations relationship table
CREATE TABLE IF NOT EXISTS eosi_organizations (
  id SERIAL PRIMARY KEY,
  eosi_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(eosi_user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_eosi_organizations_eosi ON eosi_organizations(eosi_user_id);
CREATE INDEX IF NOT EXISTS idx_eosi_organizations_org ON eosi_organizations(organization_id);

-- Update existing EOS Worldwide users to be EOSI
UPDATE users 
SET is_eosi = true, eosi_email = email 
WHERE email LIKE '%@eosworldwide.com';