-- Trademark Compliance Database Migration
-- This migration renames tables and columns to remove trademarked terms
-- IMPORTANT: Run this AFTER updating all application code

-- Rename tables
ALTER TABLE vtos RENAME TO business_blueprints;
ALTER TABLE rocks RENAME TO quarterly_priorities;
ALTER TABLE eosi_organizations RENAME TO consultant_organizations;

-- Rename columns in users table
ALTER TABLE users RENAME COLUMN is_eosi TO is_consultant;
ALTER TABLE users RENAME COLUMN eosi_email TO consultant_email;

-- Rename columns in consultant_organizations table (formerly eosi_organizations)
ALTER TABLE consultant_organizations RENAME COLUMN eosi_user_id TO consultant_user_id;

-- Update indexes
DROP INDEX IF EXISTS idx_users_eosi_email;
CREATE INDEX idx_users_consultant_email ON users(consultant_email);

DROP INDEX IF EXISTS idx_eosi_organizations_eosi;
CREATE INDEX idx_consultant_organizations_consultant ON consultant_organizations(consultant_user_id);

DROP INDEX IF EXISTS idx_eosi_organizations_org;
CREATE INDEX idx_consultant_organizations_org ON consultant_organizations(organization_id);

-- Update sequences
ALTER SEQUENCE vtos_id_seq RENAME TO business_blueprints_id_seq;
ALTER SEQUENCE rocks_id_seq RENAME TO quarterly_priorities_id_seq;
ALTER SEQUENCE eosi_organizations_id_seq RENAME TO consultant_organizations_id_seq;

-- Add comments to document the changes
COMMENT ON TABLE business_blueprints IS 'Formerly vtos (Vision/Traction Organizer)';
COMMENT ON TABLE quarterly_priorities IS 'Formerly rocks';
COMMENT ON TABLE consultant_organizations IS 'Formerly eosi_organizations';
COMMENT ON COLUMN users.is_consultant IS 'Formerly is_eosi';
COMMENT ON COLUMN users.consultant_email IS 'Formerly eosi_email';

-- Note: Foreign key constraints will automatically update to reference the new table names