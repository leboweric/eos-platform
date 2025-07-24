-- Remove category constraint from documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Make category nullable since we're phasing it out
ALTER TABLE documents ALTER COLUMN category DROP NOT NULL;

-- Add visibility to folders
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) NOT NULL DEFAULT 'personal';

-- Add department_id for department-level folders
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Add constraint for visibility
ALTER TABLE document_folders ADD CONSTRAINT document_folders_visibility_check 
CHECK (visibility IN ('company', 'department', 'personal'));

-- Add constraint to ensure department_id is set when visibility is 'department'
ALTER TABLE document_folders ADD CONSTRAINT document_folders_department_check
CHECK ((visibility = 'department' AND department_id IS NOT NULL) OR (visibility != 'department' AND department_id IS NULL));

-- Add owner_id for personal folders
ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add constraint to ensure owner_id is set when visibility is 'personal'
ALTER TABLE document_folders ADD CONSTRAINT document_folders_owner_check
CHECK ((visibility = 'personal' AND owner_id IS NOT NULL) OR (visibility != 'personal' AND owner_id IS NULL));

-- Update unique constraint to include visibility context
ALTER TABLE document_folders DROP CONSTRAINT IF EXISTS document_folders_name_parent_folder_id_organization_id_key;

-- Create new unique constraint that considers visibility and ownership
CREATE UNIQUE INDEX idx_unique_folder_name ON document_folders (
  name, 
  parent_folder_id, 
  organization_id,
  visibility,
  COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_folders_visibility ON document_folders(visibility);
CREATE INDEX IF NOT EXISTS idx_document_folders_owner ON document_folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_department ON document_folders(department_id);

-- Comment on deprecated category field
COMMENT ON COLUMN documents.category IS 'DEPRECATED - Use folder organization instead';