# AXP Prospect Tracking System - Setup Guide

## Overview
The AXP Prospect Tracking System helps you identify and track potential customers who are already using EOS or competitor platforms. It automatically finds companies showing buying signals and enriches them with contact data.

## Features Built
✅ **Database Schema** - Complete PostgreSQL tables for prospects, contacts, signals, and reviews
✅ **Backend API** - Full CRUD operations for managing prospects
✅ **Competitor Review Scraper** - Monitors G2/Capterra for unhappy competitor users  
✅ **Apollo.io Integration** - Enriches companies with revenue, employee count, and contacts
✅ **Scoring Algorithm** - Automatically scores prospects based on signals (competitor usage, company size, etc.)
✅ **React Dashboard** - View and manage prospects with filtering and search
✅ **Admin Access Control** - Only admins can access the prospect tracking system

## Setup Instructions

### 1. Database Setup
Run the migration to create the prospect tracking tables:

```bash
cd backend
psql $DATABASE_URL < migrations/create_prospect_tracking_tables.sql
```

### 2. Environment Variables
Add these to your backend `.env` file:

```env
# Required for Apollo.io enrichment
APOLLO_API_KEY=your_apollo_api_key_here

# Optional for enhanced scraping
APIFY_API_KEY=your_apify_key_here
PHANTOMBUSTER_API_KEY=your_phantombuster_key_here
```

### 3. Get API Keys

#### Apollo.io (Required for enrichment)
1. Sign up at https://app.apollo.io
2. Go to Settings → API → Create API Key
3. Choose the $149/month plan for 1000 enrichments/month

#### PhantomBuster (Optional for LinkedIn)
1. Sign up at https://phantombuster.com
2. Get API key from account settings
3. $30/month for automation

#### Apify (Optional for review scraping)
1. Sign up at https://apify.com
2. Get API key from settings
3. $49/month for web scraping

### 4. Access the Dashboard
1. Log in as an admin user
2. Navigate to `/prospects` or click "Prospects" in the admin menu
3. You'll see the prospect dashboard with filtering and search

## How to Use

### Manual Testing
1. **Test Review Scraping**: Click "Scrape Reviews" button to find unhappy competitor users
2. **Test Enrichment**: Click "Enrich Data" to add company/contact info via Apollo
3. **View Details**: Click on any prospect to see full details including contacts and signals

### Automated Workflows (Coming Next)

#### With Make.com ($20/month)
1. Create account at make.com
2. Set up these scenarios:
   - Daily LinkedIn scraping → Send to your API
   - Competitor review monitoring → Alert on bad reviews
   - Enrichment pipeline → Auto-enrich new prospects

#### With Zapier (Alternative)
Similar workflows can be created with Zapier if preferred

### API Endpoints

```javascript
// Get all prospects
GET /api/v1/prospects?tier=hot&status=new

// Get single prospect with details
GET /api/v1/prospects/:id

// Create new prospect
POST /api/v1/prospects
{
  "company_name": "Example Corp",
  "website": "example.com",
  "using_competitor": "ninety_io"
}

// Bulk import from automation
POST /api/v1/prospects/bulk-import
{
  "prospects": [...]
}

// Add signal to prospect
POST /api/v1/prospects/:id/signals
{
  "signal_type": "job_posting",
  "signal_strength": 8,
  "signal_data": {...}
}
```

## Prospect Scoring Logic

The system automatically scores prospects based on:

- **Using competitor** (Ninety.io, Bloom Growth): +10 points
- **Bad competitor review** (≤3 stars): +10 points  
- **Has EOS job titles** (Integrator, Visionary): +8 points
- **Right company size** (10-250 employees): +5 points
- **High growth rate** (>20% YoY): +5 points
- **Recent funding**: +3 points

**Tiers:**
- 🔥 **Hot** (15+ points): Ready to buy, approach immediately
- ⚡ **Warm** (8-14 points): Nurture with targeted content
- ❄️ **Cold** (0-7 points): Monitor for future signals

## What's Next?

### Remaining Setup Tasks
1. **PhantomBuster Setup** (30 min)
   - Configure LinkedIn Company Scraper phantom
   - Set up daily runs for EOS searches
   - Connect webhook to your API

2. **Make.com Automation** (1 hour)
   - Create competitor monitoring workflow
   - Set up enrichment pipeline
   - Configure daily summary emails

3. **Outreach Templates** (30 min)
   - Create templates for different prospect tiers
   - Set up email sequences
   - Configure CRM integration

## Testing the System

### Quick Test Flow
1. **Add a test prospect manually**:
```bash
curl -X POST http://localhost:3001/api/v1/prospects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "website": "testcompany.com",
    "using_competitor": "ninety_io",
    "employee_count": 50
  }'
```

2. **Check the dashboard** at `/prospects`
3. **Run enrichment** to see Apollo data populate
4. **View prospect details** to see contacts and signals

## Troubleshooting

### Common Issues

**"No prospects showing"**
- Check you're logged in as admin
- Verify database migration ran successfully
- Check browser console for API errors

**"Enrichment not working"**
- Verify APOLLO_API_KEY is set in .env
- Check you have API credits remaining
- Look at backend logs for error messages

**"Scraping returns no results"**
- G2/Capterra may have changed their HTML structure
- Check if manual access to review sites works
- Consider using Apify's pre-built actors instead

## Support Resources

- **Apollo.io Docs**: https://apolloio.github.io/apollo-api-docs/
- **PhantomBuster Docs**: https://hub.phantombuster.com/
- **Make.com Templates**: https://www.make.com/en/templates
- **Apify Actors**: https://apify.com/store

## Monthly Costs Summary

**Minimum Setup** ($250/month):
- Apollo.io: $149
- LinkedIn Sales Navigator: $99

**Recommended Setup** ($350/month):
- Apollo.io: $149
- LinkedIn Sales Navigator: $99
- PhantomBuster: $30
- Make.com: $20
- Apify: $49

**ROI**: Each new customer pays for 3-6 months of tools

---

Ready to start finding prospects! The system is fully built and integrated into AXP.
Next steps are setting up the external services and automation workflows.