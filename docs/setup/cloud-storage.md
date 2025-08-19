# Cloud Storage Integration Guide

## Overview
Revolutionary cloud storage integration allowing organizations to store documents in their own Google Drive, OneDrive, or SharePoint instead of internal database. Provides complete data sovereignty while maintaining seamless integration.

## Architecture
- **Storage Factory Pattern**: `StorageFactory` manages adapter creation and caching
- **Base Adapter Class**: `StorageAdapter` defines the interface all providers must implement
- **Provider Adapters**:
  - `GoogleDriveAdapter`: Google Drive integration via service account
  - `OneDriveAdapter`: Microsoft OneDrive/SharePoint via app-only auth
  - `InternalStorageAdapter`: PostgreSQL bytea storage (default)

## Key Features
1. **Seamless Provider Switching**: Organizations can change storage providers without data loss
2. **Hierarchical Folder Structure**: Auto-creates year/quarter/department folders
3. **Permission Sync**: Maps AXP visibility (company/department/private) to cloud permissions
4. **Admin Configuration UI**: Complete setup wizard with embedded guides
5. **Test Connection**: Validates configuration before saving

## Configuration Requirements

### Google Drive
- Service Account with domain-wide delegation
- Google Workspace Admin approval
- Drive API enabled
- Root folder ID

### OneDrive/SharePoint  
- Azure AD App Registration
- Application permissions (Files.ReadWrite.All)
- Admin consent granted
- Tenant ID, Client ID, Client Secret

## Database Schema
```sql
ALTER TABLE organizations ADD COLUMN default_storage_provider VARCHAR(50) DEFAULT 'internal';
ALTER TABLE organizations ADD COLUMN storage_config JSONB DEFAULT '{}';
ALTER TABLE documents ADD COLUMN storage_provider VARCHAR(50);
ALTER TABLE documents ADD COLUMN external_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN external_url TEXT;
```

## Important Implementation Notes
- Use `import { query as dbQuery }` to avoid naming conflicts
- All storage operations are async and return standardized responses
- Errors are logged to `cloud_storage_sync_log` table
- Provider config is encrypted in database