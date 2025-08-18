# OneDrive/SharePoint Integration Setup Guide for AXP Platform

## Overview
This guide will help you configure OneDrive or SharePoint integration so that all documents uploaded to AXP are automatically stored in your organization's Microsoft 365 storage instead of AXP's internal storage.

## Benefits
- ✅ **Data Ownership**: Your files remain in your Microsoft 365 tenant
- ✅ **Compliance**: Meet your organization's data residency and compliance requirements
- ✅ **Cost Effective**: Use your existing Microsoft 365 storage quota
- ✅ **Native Collaboration**: Edit documents directly in Office Online
- ✅ **Advanced Security**: Leverage Microsoft Purview, DLP, and retention policies
- ✅ **Single Sign-On**: Works seamlessly with Microsoft OAuth login

## Prerequisites
- Microsoft 365 Global Administrator or Application Administrator access
- Organization already set up in AXP Platform
- SharePoint site (if using SharePoint instead of OneDrive)
- 15-20 minutes for configuration

## Choose Your Storage Location

### Option A: OneDrive for Business
Best for: Smaller organizations, simple document management
- Documents stored in a dedicated service account's OneDrive
- Simpler setup and management
- 1TB default storage limit

### Option B: SharePoint Document Library
Best for: Larger organizations, advanced document management
- Documents stored in a dedicated SharePoint site
- Better for team collaboration
- More granular permissions
- Unlimited storage potential

## Setup Steps

### Step 1: Register an Application in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `AXP Document Storage`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave blank for now
5. Click **Register**
6. Copy and save the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Application permissions**
5. Add these permissions:
   - `Files.ReadWrite.All` - Read and write files in all site collections
   - `Sites.ReadWrite.All` - Read and write items in all site collections
   - `User.Read.All` - Read all users' profiles (for permission mapping)
   - `Group.Read.All` - Read all groups (for department mapping)
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Confirm by clicking **Yes**

### Step 3: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `AXP Platform Integration`
4. Select expiration: **24 months** (recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again)
7. Save this secret securely

### Step 4A: Setup OneDrive for Business (if chosen)

1. Create a service account user:
   - Go to [Microsoft 365 Admin Center](https://admin.microsoft.com)
   - Navigate to **Users** > **Active users**
   - Click **Add a user**
   - Username: `axp-storage@yourdomain.com`
   - Name: `AXP Document Storage`
   - Assign a Microsoft 365 license with OneDrive
   
2. Configure OneDrive:
   - Sign in as the service account user
   - Go to OneDrive
   - Create a folder called `AXP Platform`
   - Copy the folder URL for later

### Step 4B: Setup SharePoint Site (if chosen)

1. Go to [SharePoint Admin Center](https://admin.microsoft.com/sharepoint)
2. Click **Sites** > **Active sites**
3. Click **Create**
4. Choose **Team site**
5. Fill in:
   - **Site name**: `AXP Document Storage`
   - **Site address**: `axp-documents`
   - **Privacy settings**: Private
6. Click **Next** and **Finish**
7. Once created, click on the site
8. Copy the **Site ID** from the URL or properties

### Step 5: Get Required IDs

#### For OneDrive:
1. Using Microsoft Graph Explorer or PowerShell:
```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "User.Read.All", "Files.Read.All"

# Get the drive ID
$user = Get-MgUser -UserId "axp-storage@yourdomain.com"
$drive = Get-MgUserDrive -UserId $user.Id
Write-Host "Drive ID: $($drive.Id)"
```

#### For SharePoint:
1. Using Microsoft Graph Explorer:
   - Go to [Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)
   - Sign in with admin account
   - Run this query:
   ```
   GET https://graph.microsoft.com/v1.0/sites/yourdomain.sharepoint.com:/sites/axp-documents
   ```
   - Copy the `id` field (Site ID)
   - Run this query:
   ```
   GET https://graph.microsoft.com/v1.0/sites/[SITE_ID]/drives
   ```
   - Copy the `id` of the default document library (Drive ID)

### Step 6: Configure AXP Platform

Provide the following information to your AXP administrator:

#### For OneDrive:
```json
{
  "storage_provider": "onedrive",
  "tenant_id": "[Your Tenant ID from Step 1]",
  "client_id": "[Your Application ID from Step 1]",
  "client_secret": "[Your Client Secret from Step 3]",
  "drive_id": "[Drive ID from Step 5]",
  "root_folder_path": "/AXP Platform",
  "service_account_email": "axp-storage@yourdomain.com"
}
```

#### For SharePoint:
```json
{
  "storage_provider": "sharepoint",
  "tenant_id": "[Your Tenant ID from Step 1]",
  "client_id": "[Your Application ID from Step 1]",
  "client_secret": "[Your Client Secret from Step 3]",
  "site_id": "[Site ID from Step 5]",
  "drive_id": "[Drive ID from Step 5]",
  "root_folder_path": "/Shared Documents/AXP Platform"
}
```

### Step 7: Configure Optional Settings

- **Enable Viewer Embedding**: Allow documents to be previewed directly in AXP using Office Online
- **Folder Structure**: 
  - `hierarchical`: Creates subfolders for each Rock/Issue/Team
  - `flat`: All files in root with metadata
- **Version Control**: Enable SharePoint versioning for document history
- **Sensitivity Labels**: Apply Microsoft Purview sensitivity labels automatically

## Folder Structure

Once configured, AXP will automatically organize your files:

```
AXP Platform/
├── Quarterly Priorities/
│   ├── 2025-Q1/
│   │   ├── Priority-001/
│   │   └── Priority-002/
│   └── 2025-Q2/
├── Issues/
│   ├── Issue-001/
│   └── Issue-002/
├── Scorecards/
│   └── Exports/
├── Meeting Notes/
└── General Documents/
```

## Security Considerations

- ✅ Application uses app-only authentication (no user context required)
- ✅ All file operations are logged in both AXP and Microsoft 365 audit logs
- ✅ Permissions sync with AXP's role-based access control
- ✅ Client secret is encrypted in AXP's database
- ✅ Complies with your tenant's Conditional Access policies

## Permissions Mapping

| AXP Visibility | SharePoint/OneDrive Permission |
|---------------|-------------------------------|
| Company | Shared with all organization users |
| Department | Shared with department security group |
| Private | Only document owner |
| Public | Anyone with link (if allowed by tenant) |

## Advanced Configuration

### Conditional Access
If your organization uses Conditional Access:
1. Go to **Azure AD** > **Security** > **Conditional Access**
2. Ensure the AXP app is excluded or properly configured
3. Consider location-based restrictions if needed

### Data Loss Prevention (DLP)
Configure DLP policies to work with AXP:
1. Go to **Microsoft Purview compliance portal**
2. Navigate to **Data loss prevention**
3. Create or modify policies to include the AXP storage location
4. Test with sample documents

## Troubleshooting

### "Access Denied" Errors
- Verify admin consent was granted for all permissions
- Check the client secret hasn't expired
- Ensure the app registration is not blocked by Conditional Access

### Files Not Appearing
- Verify Microsoft Graph API permissions are correct
- Check Site ID and Drive ID are accurate
- Ensure no DLP policies are blocking file creation

### Authentication Issues
- Verify Tenant ID and Client ID are correct
- Check client secret was copied correctly (no extra spaces)
- Ensure app registration is in the correct tenant

## Monitoring

### Microsoft 365 Audit Logs
View all AXP file operations:
1. Go to [Microsoft Purview compliance portal](https://compliance.microsoft.com)
2. Navigate to **Audit**
3. Search for activities by the AXP application

### Storage Quota
Monitor storage usage:
1. SharePoint: Check site storage in SharePoint Admin Center
2. OneDrive: Check in Microsoft 365 Admin Center > Users

## Support

For assistance with setup:
- AXP Platform Support: support@axplatform.app
- Your Microsoft 365 Administrator
- Microsoft Support (for Azure AD issues)

## Data Migration

If you have existing documents in AXP:
1. New uploads will automatically use OneDrive/SharePoint
2. Existing files remain in AXP storage
3. Optional bulk migration available - contact support
4. Migration maintains all metadata and permissions

## Compliance Features

AXP integration supports:
- **Retention Policies**: Applied automatically to uploaded documents
- **Sensitivity Labels**: Can be applied based on AXP document type
- **eDiscovery**: All documents are discoverable through Microsoft Purview
- **Audit Logs**: Complete audit trail in Microsoft 365 Compliance Center

## Reverting to Internal Storage

You can switch back to AXP's internal storage:
1. Go to Organization Settings > Storage
2. Change provider to "Internal"
3. Existing OneDrive/SharePoint links remain accessible
4. New uploads will use AXP storage

## Client Secret Rotation

Before your client secret expires:
1. Create a new client secret in Azure AD
2. Update AXP configuration with new secret
3. Delete old secret after confirming new one works
4. Recommended: Set calendar reminder 30 days before expiration

---

*Last Updated: August 2025*
*Version: 1.0*