# Microsoft Integration Design Documentation

## Executive Summary
The AXP platform implements a comprehensive Microsoft integration architecture that provides OAuth authentication via Microsoft accounts and OneDrive/SharePoint cloud storage capabilities. The integration uses Microsoft Azure Active Directory (AAD) and Microsoft Graph API to deliver seamless authentication and file management services.

## Architecture Overview

### Integration Components
1. **Microsoft OAuth 2.0 Authentication** - User authentication via Microsoft accounts
2. **Microsoft Graph API Integration** - Access to Microsoft 365 services
3. **OneDrive/SharePoint Storage Adapter** - Cloud file storage and management
4. **Multi-tenant Azure AD Support** - Works with any Microsoft organizational account

## 1. Microsoft OAuth Authentication

### Technology Stack
- **MSAL Node Library** (`@azure/msal-node`): Microsoft's official authentication library
- **Microsoft Graph Client** (`@microsoft/microsoft-graph-client`): API client for Microsoft services
- **JWT Authentication**: Token-based session management

### OAuth Flow Architecture

```
User → Frontend → Backend → Microsoft Azure AD → Backend → Database → Frontend
```

#### Detailed Flow:
1. **Initiation**: User clicks "Continue with Microsoft" button on login page
2. **Auth URL Generation**: Backend generates Microsoft OAuth URL with proper scopes
3. **Microsoft Login**: User authenticates with Microsoft (supports personal & work accounts)
4. **Code Exchange**: Backend exchanges authorization code for access tokens
5. **User Profile Retrieval**: Fetches user data via Microsoft Graph API
6. **Account Management**: Creates new user or links existing account by email
7. **JWT Generation**: Issues platform JWT token for session
8. **Success Redirect**: Returns user to platform with authentication token

### Configuration

#### Azure AD Application Setup
```javascript
const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common', // Multi-tenant
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  }
};
```

#### OAuth Scopes Requested
- `user.read` - Basic user profile information
- `email` - User's email address
- `profile` - Extended profile data
- `openid` - OpenID Connect authentication

### User Account Management

#### New User Creation Logic
```javascript
// Email extraction hierarchy
const email = microsoftUser.mail || microsoftUser.userPrincipalName || microsoftUser.email;

// Organization assignment
if (emailDomain === 'myboyum.com') {
  // Assign to specific Boyum organization
} else {
  // Assign to first available organization or redirect to registration
}
```

#### Database Schema
```sql
-- OAuth-specific user fields
users table:
- microsoft_id: VARCHAR(255) UNIQUE -- Microsoft account ID
- oauth_provider: VARCHAR(50) -- 'microsoft', 'google', etc.
- email_verified: BOOLEAN -- Pre-verified for Microsoft accounts
- last_login_at: TIMESTAMP -- Track user activity
```

### Security Features
- **Password Generation**: OAuth users get random passwords (not used for login)
- **Email Pre-verification**: Microsoft emails considered pre-verified
- **Login Tracking**: Records authentication method and user agent for security auditing
- **Multi-factor Support**: Inherits MFA from user's Microsoft account settings

## 2. OneDrive/SharePoint Storage Integration

### Architecture Design

#### Storage Adapter Pattern
```
StorageAdapter (Base Class)
    ↓
OneDriveAdapter (Extends Base)
    ↓
Microsoft Graph API
    ↓
OneDrive/SharePoint
```

### Core Capabilities

#### File Operations
- **Upload**: Direct file upload to OneDrive/SharePoint
- **Download**: Retrieve files with proper MIME types
- **Delete**: Remove files from cloud storage
- **Move**: Relocate files between folders
- **Copy**: Duplicate files with optional renaming
- **Search**: Full-text search across stored files

#### Folder Management
- **Hierarchical Structure**: Year-Quarter-Department organization
- **Auto-creation**: Creates folder structure on-demand
- **Custom Paths**: Configurable root folder paths

#### Permission Management
- **Company-wide**: Share with entire organization
- **Department-level**: Restrict to specific teams
- **Private**: Owner-only access
- **Public**: Anonymous link sharing
- **Custom**: Specific user/group permissions

### Implementation Details

#### Authentication Flow
```javascript
// App-only authentication for storage operations
const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: config.client_id,
    authority: `https://login.microsoftonline.com/${config.tenant_id}`,
    clientSecret: config.client_secret
  }
});

// Acquire token for Microsoft Graph
const tokenResponse = await msalClient.acquireTokenByClientCredential({
  scopes: ['https://graph.microsoft.com/.default']
});
```

#### Folder Structure Strategy
```
/AXP Platform/
  ├── 2024-Q1/
  │   ├── Department-Marketing/
  │   │   └── [Files]
  │   └── Department-Sales/
  │       └── [Files]
  └── 2024-Q2/
      └── [Files]
```

#### Metadata Storage
Files stored in OneDrive/SharePoint with metadata tracked in PostgreSQL:
```sql
documents table:
- external_id: OneDrive item ID
- external_url: SharePoint/OneDrive web URL
- external_thumbnail_url: Preview image URL
- storage_provider: 'onedrive' or 'sharepoint'
- visibility: Permission level
- external_parent_folder_id: Folder path in cloud
```

### Advanced Features

#### Share Link Generation
```javascript
async generateShareLink(fileId, options) {
  return graphClient.api(`/drive/items/${fileId}/createLink`)
    .post({
      type: 'view' | 'edit' | 'embed',
      scope: 'anonymous' | 'organization',
      expirationDateTime: optional,
      password: optional
    });
}
```

#### Storage Quota Management
```javascript
async getQuota() {
  const drive = await graphClient.api('/drive').select('quota').get();
  return {
    used: bytes,
    total: bytes,
    remaining: bytes,
    state: 'normal' | 'nearing' | 'critical' | 'exceeded'
  };
}
```

#### Thumbnail Generation
- Automatic thumbnail retrieval for images
- Multiple size options (small, medium, large)
- Cached URLs for performance

## 3. Microsoft Graph API Integration

### API Endpoints Used

#### User Management
- `GET /v1.0/me` - Retrieve authenticated user profile
- `GET /v1.0/users/{id}` - Get specific user details

#### File Operations
- `PUT /drive/items/{id}/content` - Upload file content
- `GET /drive/items/{id}` - Get file metadata
- `DELETE /drive/items/{id}` - Delete file
- `POST /drive/items/{id}/copy` - Copy file
- `PATCH /drive/items/{id}` - Move/rename file

#### Search & Discovery
- `POST /search/query` - Search files across storage
- `GET /drive/items/{id}/children` - List folder contents
- `GET /drive/items/{id}/thumbnails` - Get preview images

#### Permissions
- `POST /drive/items/{id}/invite` - Share with users
- `POST /drive/items/{id}/createLink` - Generate share links
- `GET /drive/items/{id}/permissions` - List permissions
- `DELETE /drive/items/{id}/permissions/{id}` - Revoke access

### Error Handling

#### Graph API Error Codes
```javascript
handleError(error) {
  switch(error.statusCode) {
    case 404: 'File not found in OneDrive/SharePoint'
    case 403: 'Permission denied - check SharePoint permissions'
    case 401: 'Authentication failed - check app registration'
    case 507: 'Storage quota exceeded'
    case 429: 'Rate limit exceeded - retry after delay'
  }
}
```

## 4. Security & Compliance

### Authentication Security
- **Multi-tenant Support**: Works with any Azure AD tenant
- **Token Management**: Secure token storage and refresh
- **Session Validation**: JWT verification on each request
- **Rate Limiting**: Prevents brute force attempts

### Data Security
- **Encryption in Transit**: All API calls over HTTPS
- **Encryption at Rest**: Handled by Microsoft's infrastructure
- **Access Control**: Granular permission management
- **Audit Logging**: Comprehensive operation tracking

### Compliance Features
- **GDPR Compliant**: Data sovereignty maintained
- **SOC 2 Alignment**: Security controls implemented
- **Data Residency**: Files remain in organization's tenant
- **No Data Duplication**: Metadata only in platform database

## 5. Configuration Requirements

### Environment Variables
```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=<Azure App Registration ID>
MICROSOFT_CLIENT_SECRET=<Azure App Secret>
MICROSOFT_CALLBACK_URL=https://api.axplatform.app/api/v1/auth/microsoft/callback

# OneDrive/SharePoint Storage (per organization)
STORAGE_PROVIDER=onedrive|sharepoint
ONEDRIVE_CLIENT_ID=<App Registration ID>
ONEDRIVE_CLIENT_SECRET=<App Secret>
ONEDRIVE_TENANT_ID=<Azure Tenant ID>
ONEDRIVE_DRIVE_ID=<Drive or Site ID>
```

### Azure Portal Configuration

#### App Registration Requirements
1. **Supported Account Types**: Accounts in any organizational directory (multitenant)
2. **Redirect URIs**: 
   - Production: `https://api.axplatform.app/api/v1/auth/microsoft/callback`
   - Local: `http://localhost:5000/api/v1/auth/microsoft/callback`
3. **API Permissions**:
   - Microsoft Graph:
     - User.Read (Delegated)
     - Files.ReadWrite.All (Application)
     - Sites.ReadWrite.All (Application) - for SharePoint

### DNS Configuration
```
api.axplatform.app → Railway backend deployment
*.axplatform.app → Netlify frontend (wildcard for client subdomains)
```

## 6. Frontend Implementation

### Login Component
```jsx
// Microsoft OAuth button in LoginPage.jsx
<Button onClick={async () => {
  await oauthService.microsoftLogin(); // Redirects to Microsoft
}}>
  <MicrosoftLogo />
  Continue with Microsoft
</Button>
```

### OAuth Service
```javascript
// oauthService.js
microsoftLogin: async () => {
  const response = await axios.get('/auth/microsoft');
  window.location.href = response.data.authUrl; // Redirect to Microsoft
}
```

### Success Handling
```javascript
// OAuth callback processing
handleOAuthCallback: async (provider, code, state) => {
  const response = await axios.post(`/auth/${provider}/callback`, {
    code,
    state
  });
  localStorage.setItem('token', response.data.token);
}
```

## 7. Database Integration

### User Management Tables
```sql
-- Users table with Microsoft OAuth fields
users:
  - id: UUID PRIMARY KEY
  - email: VARCHAR(255) UNIQUE
  - microsoft_id: VARCHAR(255) UNIQUE
  - oauth_provider: VARCHAR(50)
  - email_verified: BOOLEAN
  - organization_id: UUID REFERENCES organizations

-- Login tracking for analytics
user_login_tracking:
  - user_id: UUID REFERENCES users
  - auth_method: 'microsoft' | 'google' | 'password'
  - ip_address: INET
  - user_agent: TEXT
  - created_at: TIMESTAMP
```

### Storage Metadata Tables
```sql
-- Document storage metadata
documents:
  - id: UUID PRIMARY KEY
  - external_id: VARCHAR(255) -- OneDrive item ID
  - external_url: TEXT -- SharePoint web URL
  - storage_provider: VARCHAR(50)
  - organization_id: UUID
  - visibility: VARCHAR(20)
  - file_name: VARCHAR(255)
  - file_size: BIGINT
  - mime_type: VARCHAR(100)
```

## 8. Special Implementations

### Multi-domain Support
- Boyum organization: Special handling for `myboyum.com` emails
- Automatic organization assignment based on email domain
- Subdomain routing: `myboyum.axplatform.app`

### Graceful Fallbacks
```javascript
// Email extraction fallback chain
const email = 
  microsoftUser.mail ||           // Preferred field
  microsoftUser.userPrincipalName || // Work accounts
  microsoftUser.email;             // Legacy field
```

### Performance Optimizations
- Token caching to reduce API calls
- Thumbnail URL caching
- Batch operations where possible
- Lazy folder creation

## 9. Testing & Validation

### OAuth Testing Endpoints
```bash
# Test Microsoft OAuth flow
curl https://api.axplatform.app/api/v1/auth/microsoft

# Verify callback handling
curl -X POST https://api.axplatform.app/api/v1/auth/microsoft/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code","state":"https://axplatform.app"}'
```

### Storage Adapter Validation
```javascript
// Built-in validation method
async validateConfig() {
  await this.initialize();           // Test authentication
  await this.graphClient.api('/drive').get(); // Test API access
  const testFolder = await this.createFolder('AXP_Test'); // Test write
  await this.delete(testFolder.id);  // Test delete & cleanup
  return { valid: true };
}
```

## 10. Common Issues & Solutions

### Authentication Issues
- **"No email found in Microsoft account"**: User account missing email claim
- **"Invalid grant"**: Authorization code expired or already used
- **Solution**: Ensure proper scope configuration and timely code exchange

### Storage Issues
- **"Permission denied"**: App registration missing required Graph API permissions
- **"File not found"**: Incorrect drive ID or file moved/deleted
- **Solution**: Verify app permissions in Azure Portal

### CORS Issues
- **Development**: Use proxy configuration in Vite
- **Production**: Ensure proper domain configuration
- **Solution**: Check allowed origins in backend CORS settings

## 11. Future Enhancements

### Planned Features
1. **Teams Integration**: Direct file sharing to Microsoft Teams channels
2. **Calendar Sync**: Meeting scheduling via Outlook calendar
3. **Email Integration**: Send notifications via Outlook
4. **Power Automate**: Workflow automation triggers

### Optimization Opportunities
1. **Batch API Calls**: Reduce round trips with Graph batch endpoint
2. **Delta Queries**: Track only changed files
3. **Webhook Subscriptions**: Real-time file change notifications
4. **Adaptive Card Rendering**: Rich content in Teams/Outlook

## Conclusion

The Microsoft integration in AXP provides a robust, secure, and scalable solution for authentication and cloud storage. By leveraging Microsoft's enterprise-grade infrastructure through Azure AD and Microsoft Graph API, the platform delivers seamless integration with Microsoft 365 services while maintaining data sovereignty and security compliance.

The architecture follows best practices for OAuth implementation, uses official Microsoft libraries, and implements comprehensive error handling and fallback mechanisms. The storage adapter pattern ensures flexibility for future cloud provider integrations while maintaining a consistent API surface.