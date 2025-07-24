-- First, update existing documents to map old categories to new ones
UPDATE documents 
SET category = CASE 
  WHEN category IN ('strategy', 'blueprints') THEN 'strategy_plans'
  WHEN category IN ('policies', 'templates', 'training') THEN 'sops'
  WHEN category IN ('meeting_notes', 'reports') THEN 'project_plans'
  ELSE category
END;

-- Drop the old constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Add new constraint with updated categories
ALTER TABLE documents ADD CONSTRAINT documents_category_check 
CHECK (category IN ('strategy_plans', 'project_plans', 'sops'));

-- Add folder support
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, parent_folder_id, organization_id)
);

-- Add folder reference to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_org ON document_folders(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);