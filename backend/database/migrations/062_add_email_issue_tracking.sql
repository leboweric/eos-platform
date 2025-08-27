-- Add email tracking columns to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS created_via VARCHAR(20) DEFAULT 'web',
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Add email configuration to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS email_issues_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_issues_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_issues_whitelist TEXT[]; -- Array of allowed email domains/addresses

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_issues_external_id ON issues(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_created_via ON issues(created_via);

-- Add comments
COMMENT ON COLUMN issues.created_via IS 'Source of issue creation: web, email, api, slack, etc.';
COMMENT ON COLUMN issues.external_id IS 'External reference ID (e.g., email message-id, slack thread-id)';
COMMENT ON COLUMN organizations.email_issues_enabled IS 'Whether email-to-issue feature is enabled for this org';
COMMENT ON COLUMN organizations.email_issues_address IS 'Custom email address for this organization (e.g., issues-orgname@axplatform.app)';
COMMENT ON COLUMN organizations.email_issues_whitelist IS 'List of allowed email domains or specific addresses that can create issues';