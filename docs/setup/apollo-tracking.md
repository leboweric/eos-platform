# Apollo.io Website Visitor Tracking Setup Guide

## Overview
This guide explains how to activate Apollo.io website visitor tracking on AXP to identify prospects who visit from your email campaigns.

## Step 1: Get Your Apollo Tracking Code

1. Log into your Apollo.io account
2. Navigate to **Settings** → **Ideal customer profile** → **Website visitors**
3. Click **"Add Domain"**
4. Enter: `https://axplatform.app`
5. Click **"Copy Code"** to copy your unique tracking snippet

⚠️ **Important**: Do NOT manually type or modify the tracking code. Always use the Copy button.

## Step 2: Add Tracking Code to AXP

1. Open `/frontend/index.html` in your code editor
2. Find the Apollo tracking section (around line 53-70)
3. Replace the commented placeholder with your actual Apollo tracking code:

```html
<!-- Apollo.io Website Visitor Tracking -->
<script>
  // Paste your Apollo tracking code here
  (function(){var w=window;var d=document;var s=d.createElement('script');
  s.src='https://assets.apollo.io/micro/website-tracker/tracker.iife.js';
  s.async=true;d.head.appendChild(s);w.apollo=w.apollo||{};
  w.apollo.websiteTrackingId='YOUR-ACTUAL-TRACKING-ID';})();
</script>
```

## Step 3: Enable Tracking in Configuration

1. Open `/frontend/src/config/tracking.js`
2. Update the Apollo configuration:

```javascript
export const trackingConfig = {
  apollo: {
    // Set to true to enable tracking
    enabled: true,
    
    // Add your tracking ID from Apollo
    websiteTrackingId: 'YOUR-TRACKING-ID',
    
    // Keep other settings as is
    allowedDomains: ['axplatform.app', 'www.axplatform.app'],
    debug: process.env.NODE_ENV === 'development'
  }
};
```

## Step 4: Deploy Changes

1. Commit your changes:
```bash
git add .
git commit -m "feat: Add Apollo visitor tracking for marketing campaigns"
git push
```

2. The frontend will automatically deploy to Netlify

## Step 5: Verify Installation

### In Apollo:
1. Visit your landing page: https://axplatform.app
2. In Apollo, go to **Website visitors**
3. You should see "assets.apollo.io" appear in the activity log

### In Browser DevTools:
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Search for "track_request"
4. You should see requests with status code 204

## What Gets Tracked

### Automatic Tracking:
- Page views on all public pages
- Visitor company identification (when possible)
- Time on site and pages visited
- Referral source (email campaigns)

### Conversion Events:
- Trial signups (with email and company name)
- Demo requests
- Feature interest clicks

## Using the Data in Apollo

1. **Email Campaign Attribution**:
   - See which companies visited after receiving emails
   - Track engagement from specific campaigns

2. **Lead Scoring**:
   - Prioritize prospects who visited multiple pages
   - Identify high-intent visitors

3. **Sales Alerts**:
   - Set up notifications for key account visits
   - Alert sales when hot prospects visit

## Privacy & Compliance

- Tracking only occurs on production domain (axplatform.app)
- No tracking in development environments
- Complies with GDPR - visitor identification is company-level
- Individual user data is not tracked without consent

## Troubleshooting

### Tracking Not Working:
1. Check that `enabled: true` in tracking.js
2. Verify the tracking code is uncommented in index.html
3. Check browser console for errors
4. Ensure you're testing on production domain

### No Visitors Showing in Apollo:
1. Apollo needs 10-15 minutes to start showing data
2. Company identification requires sufficient traffic
3. Some visitors may be using VPNs or privacy tools

## Advanced Features

### Custom Event Tracking:
```javascript
import { trackApolloEvent } from '@/config/tracking';

// Track custom events
trackApolloEvent('Pricing Viewed');
trackApolloEvent('Feature Demo Started', { feature: 'dashboard' });
```

### Identify Known Visitors:
```javascript
import { identifyApolloVisitor } from '@/config/tracking';

// After user logs in
identifyApolloVisitor(user.email, {
  company: user.organizationName,
  role: user.title
});
```

## Support

For Apollo-specific issues:
- Apollo Support: https://knowledge.apollo.io
- Apollo Status: https://status.apollo.io

For AXP integration issues:
- Check Railway logs for backend errors
- Review browser console for frontend errors