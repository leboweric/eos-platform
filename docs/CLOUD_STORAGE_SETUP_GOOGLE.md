# Google Drive Integration Setup Guide for AXP Platform

## Overview
This guide will help you configure Google Drive integration so that all documents uploaded to AXP are automatically stored in your organization's Google Drive instead of AXP's internal storage.

## Benefits
- ✅ **Data Ownership**: Your files remain in your Google Workspace
- ✅ **Compliance**: Meet your organization's data residency requirements
- ✅ **Cost Effective**: Use your existing Google storage quota
- ✅ **Native Collaboration**: Edit documents directly in Google Docs/Sheets/Slides
- ✅ **Backup & Recovery**: Leverage your existing Google Vault policies
- ✅ **Single Sign-On**: Works seamlessly with Google OAuth login

## Prerequisites
- Google Workspace Admin access
- Organization already set up in AXP Platform
- 10-15 minutes for configuration

## Setup Steps

### Step 1: Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your organization's project (or create a new one)
3. Navigate to **IAM & Admin** > **Service Accounts**
4. Click **Create Service Account**
5. Fill in the details:
   - **Service account name**: `AXP Document Storage`
   - **Service account ID**: `axp-document-storage`
   - **Description**: `Service account for AXP platform document storage`
6. Click **Create and Continue**
7. Skip the optional permissions (click **Continue**)
8. Click **Done**

### Step 2: Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **Google Drive API**
   - **Google Docs API** (optional, for embedded viewing)
   - **Google Sheets API** (optional, for embedded viewing)
   - **Google Slides API** (optional, for embedded viewing)

### Step 3: Create and Download Service Account Key

1. Go back to **IAM & Admin** > **Service Accounts**
2. Click on the service account you just created
3. Go to the **Keys** tab
4. Click **Add Key** > **Create new key**
5. Select **JSON** format
6. Click **Create**
7. **IMPORTANT**: Save this JSON file securely - you'll need it for AXP configuration

### Step 4: Enable Domain-Wide Delegation

1. In the service account details page, click **Show Advanced Settings**
2. Under **Domain-wide delegation**, click **Enable G Suite Domain-wide Delegation**
3. Enter a product name for the consent screen (e.g., "AXP Platform")
4. Click **Save**
5. Copy the **Client ID** (you'll need this for the next step)

### Step 5: Authorize the Service Account in Google Workspace Admin

1. Go to [Google Workspace Admin Console](https://admin.google.com)
2. Navigate to **Security** > **API Controls** > **Domain-wide delegation**
3. Click **Add new**
4. Enter the following:
   - **Client ID**: Paste the Client ID from Step 4
   - **OAuth Scopes**: Add these scopes (one per line):
     ```
     https://www.googleapis.com/auth/drive
     https://www.googleapis.com/auth/drive.file
     https://www.googleapis.com/auth/drive.metadata
     ```
5. Click **Authorize**

### Step 6: Create AXP Root Folder in Google Drive

1. Sign in to [Google Drive](https://drive.google.com) as an admin
2. Create a new folder called `AXP Platform` (or your preferred name)
3. Right-click the folder and select **Share**
4. Share it with your service account email: `axp-document-storage@[your-project-id].iam.gserviceaccount.com`
5. Set permission to **Editor**
6. Copy the Folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/[FOLDER_ID]`
   - Copy the `FOLDER_ID` part

### Step 7: Configure AXP Platform

Provide the following information to your AXP administrator:

```json
{
  "storage_provider": "google_drive",
  "service_account_email": "axp-document-storage@[your-project-id].iam.gserviceaccount.com",
  "service_account_key": "[Contents of the JSON key file from Step 3]",
  "root_folder_id": "[FOLDER_ID from Step 6]",
  "domain": "your-domain.com",
  "admin_email": "admin@your-domain.com"
}
```

### Step 8: Optional Settings

You can also configure these optional settings:

- **Enable Viewer Embedding**: Allow documents to be previewed directly in AXP
- **Folder Structure**: 
  - `hierarchical`: Creates subfolders for each Rock/Issue/Team
  - `flat`: All files in the root folder with metadata tags
- **Sharing Defaults**: Configure default sharing permissions for new uploads

## Folder Structure

Once configured, AXP will automatically organize your files:

```
AXP Platform/
├── Quarterly Priorities/
│   ├── Q1 2025/
│   │   ├── Rock 1 - Attachments/
│   │   └── Rock 2 - Attachments/
│   └── Q2 2025/
├── Issues/
│   ├── Issue-001 - Attachments/
│   └── Issue-002 - Attachments/
├── Scorecards/
│   └── Exports/
└── General Documents/
```

## Security Considerations

- ✅ Service account only has access to the designated AXP folder
- ✅ All file operations are logged in AXP's audit trail
- ✅ Permissions sync with AXP's role-based access control
- ✅ Service account credentials are encrypted in AXP's database
- ✅ Files inherit sharing permissions based on AXP visibility settings

## Permissions Mapping

| AXP Visibility | Google Drive Permission |
|---------------|------------------------|
| Company | Shared with domain |
| Department | Shared with department group |
| Private | Only document owner |
| Public | Anyone with link |

## Troubleshooting

### "Permission Denied" Errors
- Verify domain-wide delegation is properly configured
- Check that all required OAuth scopes are authorized
- Ensure service account has Editor access to root folder

### Files Not Appearing
- Verify Google Drive API is enabled
- Check service account key is valid and not expired
- Ensure root folder ID is correct

### Sync Issues
- Check AXP's cloud storage sync log in Organization Settings
- Verify your Google Workspace has sufficient storage quota
- Ensure no Google Workspace policies are blocking the service account

## Support

For assistance with setup:
- AXP Platform Support: support@axplatform.app
- Your Google Workspace Administrator
- AXP Cloud Storage Status: Check Organization Settings > Storage > Sync Status

## Data Migration

If you have existing documents in AXP:
1. New uploads will automatically use Google Drive
2. Existing files remain in AXP storage
3. Optional bulk migration available - contact support

## Reverting to Internal Storage

You can switch back to AXP's internal storage at any time:
1. Go to Organization Settings > Storage
2. Change provider to "Internal"
3. Existing Google Drive links remain accessible
4. New uploads will use AXP storage

---

*Last Updated: August 2025*
*Version: 1.0*