-- Migration: Add cloud storage provider support for documents
-- This allows organizations to store documents in their own Google Drive or OneDrive
-- instead of in our PostgreSQL database

-- Add storage provider configuration to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS default_storage_provider VARCHAR(50) DEFAULT 'internal'
  CHECK (default_storage_provider IN ('internal', 'google_drive', 'onedrive', 'sharepoint', 'box', 'dropbox'));

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS storage_config JSONB DEFAULT '{}';

-- Add cloud storage fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(50) DEFAULT 'internal'
  CHECK (storage_provider IN ('internal', 'google_drive', 'onedrive', 'sharepoint', 'box', 'dropbox'));

-- External ID from the cloud provider (Google Drive file ID, OneDrive item ID, etc.)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(500);

-- Direct URL to access the file in the cloud provider
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Sharing permissions from the cloud provider
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_permissions JSONB DEFAULT '{}';

-- Parent folder ID in the cloud provider (for organizational structure)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_parent_folder_id VARCHAR(500);

-- Thumbnail URL from the cloud provider (for preview)
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_thumbnail_url TEXT;

-- Track last sync time with cloud provider
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS external_last_synced_at TIMESTAMP;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_storage_provider ON documents(storage_provider);
CREATE INDEX IF NOT EXISTS idx_documents_external_id ON documents(external_id);
CREATE INDEX IF NOT EXISTS idx_organizations_storage_provider ON organizations(default_storage_provider);

-- Create a table to track cloud storage sync status and errors
CREATE TABLE IF NOT EXISTS cloud_storage_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  storage_provider VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'upload', 'download', 'delete', 'sync_permissions', 'create_folder'
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for sync log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_org_status ON cloud_storage_sync_log(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON cloud_storage_sync_log(created_at DESC);

-- Add comment explaining the storage_config structure
COMMENT ON COLUMN organizations.storage_config IS 'JSON configuration for cloud storage provider. Structure varies by provider:
Google Drive: {
  "service_account_email": "string",
  "service_account_key": "encrypted_string",
  "root_folder_id": "string",
  "enable_viewer_embedding": boolean,
  "folder_structure": "flat|hierarchical"
}
OneDrive/SharePoint: {
  "tenant_id": "string",
  "client_id": "string", 
  "client_secret": "encrypted_string",
  "site_id": "string",
  "drive_id": "string",
  "root_folder_id": "string",
  "enable_viewer_embedding": boolean
}';

-- Add comment explaining the external_permissions structure
COMMENT ON COLUMN documents.external_permissions IS 'JSON object storing cloud provider permissions:
{
  "readers": ["email1", "email2"],
  "writers": ["email3"],
  "is_public": boolean,
  "sharing_link": "string",
  "inherited": boolean
}';