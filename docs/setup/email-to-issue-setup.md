# Email-to-Issue Setup Guide

## Overview
AXP supports creating issues by sending emails to a designated address. The backend is already configured to process emails via SendGrid Inbound Parse webhook.

## Current Status
- ✅ Backend endpoint ready: `/api/v1/email/inbound-email`
- ✅ Email processing service implemented
- ✅ SendGrid configured for sending emails
- ❌ Inbound email address not configured

## Setup Instructions

### Option 1: Subdomain Setup (Recommended)
This keeps your main domain email (Google Workspace) intact.

#### Step 1: Add MX Record in Netlify
1. Go to Netlify Dashboard → Domain Settings → DNS
2. Add this MX record:
   ```
   Host: parse
   Value: mx.sendgrid.net
   Priority: 10
   ```

#### Step 2: Configure SendGrid Inbound Parse
1. Log in to SendGrid Dashboard
2. Navigate to **Settings** → **Inbound Parse**
3. Click **Add Host & URL**
4. Configure:
   - **Receiving Domain**: `axplatform.app`
   - **Subdomain**: `parse`
   - **Destination URL**: `https://api.axplatform.app/api/v1/email/inbound-email`
   - ✅ Check "POST the raw, full MIME message"
   - ✅ Check "Check incoming emails for spam" (optional)

#### Step 3: Test
Send an email to: `issues@parse.axplatform.app`

### Option 2: Google Workspace Forwarding
Keep `issues@axplatform.app` but forward to parse subdomain.

1. Create group/alias in Google Workspace Admin
2. Set forwarding: `issues@axplatform.app` → `issues@parse.axplatform.app`
3. Follow Option 1 setup for the parse subdomain

## Email Format Support

### Basic Format
```
To: issues@parse.axplatform.app
Subject: [Issue Title]
Body: Issue description
```

### Organization-Specific (future)
```
To: issues-[org-id]@parse.axplatform.app
```

## How It Works

1. **User sends email** to `issues@parse.axplatform.app`
2. **SendGrid receives** email via MX record
3. **SendGrid posts** to webhook: `https://api.axplatform.app/api/v1/email/inbound-email`
4. **Backend processes**:
   - Validates sender is a registered user
   - Creates issue in sender's organization
   - Sends confirmation email
5. **Issue appears** in AXP dashboard

## Security Features
- Only registered users can create issues
- Email address must match user account
- Organization access is verified
- Spam filtering via SendGrid

## Troubleshooting

### Email Bounces
- Check sender is registered user in AXP
- Verify email address matches exactly
- Check spam folder for responses

### Issues Not Created
- Check Railway logs for webhook errors
- Verify SendGrid webhook URL is correct
- Ensure backend is deployed and running

### DNS Issues
- MX records can take 24-48 hours to propagate
- Use `nslookup -type=mx parse.axplatform.app` to verify

## Testing Webhook Locally
```bash
curl -X POST https://api.axplatform.app/api/v1/email/test-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "senderEmail": "your-email@domain.com",
    "subject": "Test Issue",
    "body": "This is a test issue from email"
  }'
```

## Environment Variables Required
```env
SENDGRID_API_KEY=your-key
SENDGRID_FROM_EMAIL=noreply@axplatform.app
```

## Next Steps
1. Add MX record in Netlify DNS
2. Configure SendGrid Inbound Parse
3. Test with a real email
4. Update user documentation

## Future Enhancements
- [ ] Support attachments in issues
- [ ] Team-specific email addresses
- [ ] Priority parsing from subject line
- [ ] Auto-assign based on keywords
- [ ] Reply-to-update existing issues