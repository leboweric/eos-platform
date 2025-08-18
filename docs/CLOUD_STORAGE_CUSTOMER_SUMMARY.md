# Cloud Storage Integration for AXP Platform

## Executive Summary

AXP Platform now supports storing your documents directly in your organization's cloud storage (Google Drive or Microsoft OneDrive/SharePoint) instead of our internal servers. This gives you complete control over your data while maintaining all the benefits of AXP's document management features.

## Key Benefits

### 🔒 **Enhanced Security & Compliance**
- Your files never leave your cloud environment
- Comply with your organization's data residency requirements
- Leverage your existing security policies and controls
- Maintain complete audit trails in your own systems

### 💰 **Cost Efficiency**
- Use your existing cloud storage subscriptions
- No additional storage fees from AXP
- Reduce data transfer costs
- Leverage enterprise agreements you already have

### 🤝 **Seamless Integration**
- Works with your existing Single Sign-On (SSO)
- Native editing in Google Docs/Microsoft Office
- Automatic permission synchronization
- No change to user experience in AXP

### 🚀 **Better Collaboration**
- Real-time collaborative editing in native apps
- Familiar sharing and permission models
- Version history from your cloud provider
- Comments and annotations in native formats

## How It Works

1. **Upload in AXP** → File automatically saves to your cloud storage
2. **Organize in AXP** → Folder structure mirrors in your cloud
3. **Click to Open** → Opens in Google Drive or OneDrive
4. **Permissions Sync** → AXP visibility settings map to cloud permissions

## Available Providers

### Google Workspace
Perfect for organizations using:
- Google Drive for storage
- Google Docs, Sheets, Slides for collaboration
- Google Workspace for identity management

### Microsoft 365
Ideal for organizations using:
- OneDrive for Business
- SharePoint Online
- Microsoft Teams
- Office 365 applications

## What We Need From You

### Quick Setup (15-20 minutes)
Your IT administrator will need to:

1. **Create a service account** (Google) or **App registration** (Microsoft)
2. **Grant appropriate permissions** for AXP to access a designated folder
3. **Provide credentials** to your AXP administrator
4. **Choose your preferences** (folder structure, sharing defaults)

We provide step-by-step documentation for your IT team.

## Security & Privacy

### Your Data Stays Yours
- Files are stored entirely in your cloud account
- AXP only stores metadata (filename, size, location)
- You can revoke access at any time
- Full audit trail in both AXP and your cloud provider

### Granular Permissions
| AXP Setting | Your Cloud |
|------------|------------|
| Company-wide | Shared with your domain |
| Department | Shared with specific groups |
| Private | Only accessible to owner |

## Implementation Timeline

### Phase 1: Setup (Day 1)
- IT administrator configures cloud access
- AXP team validates connection
- Test with sample documents

### Phase 2: Migration (Optional)
- Existing documents remain in AXP (no disruption)
- New uploads go to your cloud storage
- Optional bulk migration available

### Phase 3: Full Operation
- All new documents stored in your cloud
- Complete integration with AXP workflows
- Ongoing sync and permissions management

## Frequently Asked Questions

**Q: Will this change how users interact with AXP?**
A: No, the user experience remains exactly the same. Documents are uploaded, viewed, and managed through AXP as usual.

**Q: What happens to our existing documents?**
A: Existing documents remain safely stored in AXP. Only new uploads will go to your cloud storage. We can migrate existing files if desired.

**Q: Can we switch back to AXP storage?**
A: Yes, you can change storage providers at any time through your organization settings.

**Q: What if we exceed our cloud storage quota?**
A: AXP will notify administrators before limits are reached. You manage quotas through your cloud provider.

**Q: Is this more secure than AXP's storage?**
A: Both are secure. This option gives you direct control and ensures compliance with your specific policies.

## Pricing

- **No additional cost** from AXP
- Use your existing cloud storage subscriptions
- Potential cost savings on your AXP plan (contact sales)

## Next Steps

### For Google Workspace Organizations (like Skykit):
1. Review the [Google Drive Setup Guide](./CLOUD_STORAGE_SETUP_GOOGLE.md)
2. Schedule a 30-minute setup call with our team
3. Have your Google Workspace admin available

### For Microsoft 365 Organizations (like Boyum):
1. Review the [OneDrive Setup Guide](./CLOUD_STORAGE_SETUP_ONEDRIVE.md)
2. Schedule a 30-minute setup call with our team
3. Have your Azure AD admin available

## Contact

Ready to get started? Contact your AXP account manager or email:
- **Technical Support**: support@axplatform.app
- **Sales**: sales@axplatform.app

---

*This feature is available for Professional and Enterprise plans*
*Last Updated: August 2025*