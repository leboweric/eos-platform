-- Create table to track where documents came from (issues, todos, priorities)
CREATE TABLE IF NOT EXISTS document_source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('issue', 'todo', 'priority')),
  source_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, source_type, source_id)
);

-- Add index for quick lookups
CREATE INDEX idx_document_source_links_document ON document_source_links(document_id);
CREATE INDEX idx_document_source_links_source ON document_source_links(source_type, source_id);

-- Add comment
COMMENT ON TABLE document_source_links IS 'Links documents to their source (issues, todos, priorities) for auto-uploaded attachments';