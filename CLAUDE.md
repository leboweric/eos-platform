# AXP - Adaptive Execution Platform - Essential Documentation for Claude

## Project Overview
AXP (Adaptive Execution Platform) is the world's first execution platform that adapts to any business methodology. Unlike traditional tools locked to specific frameworks, AXP seamlessly transforms between EOS, 4DX, OKRs, Scaling Up, or custom methodologies while preserving all data.

## Critical Architecture Rules

### ⚠️ NO LOCAL FILE STORAGE
- **Documents MUST be stored in PostgreSQL** as bytea, NOT on filesystem
- Railway deployments have ephemeral filesystems - local files are lost on redeploy
- Use `file_content` column, NOT `file_path`

### ⚠️ Component Naming Convention
**"Clean" Components are PRODUCTION Components!**
- `PriorityCardClean.jsx` - PRODUCTION Priority Card (with milestone editing)
- `QuarterlyPrioritiesPageClean.jsx` - PRODUCTION Quarterly Priorities page
- `DashboardClean.jsx` - PRODUCTION Dashboard
- **DO NOT DELETE "Clean" components** - they are the active production versions
- Always check App.jsx imports to verify which version is in use

### ⚠️ ES6 Module Syntax Required
Backend uses ES6 modules (`"type": "module"` in package.json):
```javascript
// ✅ Correct
import express from 'express';
export default router;

// ❌ Wrong - causes deployment failure
const express = require('express');
module.exports = router;
```

## Technology Stack
- **Backend**: Node.js with Express (ES6 modules)
- **Frontend**: React with Vite
- **Database**: PostgreSQL (Railway)
- **Hosting**: Railway (backend), Netlify (frontend)
- **Authentication**: JWT + OAuth 2.0 (Google & Microsoft)

## URLs & Endpoints
- Production: https://axplatform.app
- API: https://api.axplatform.app/api/v1
- Railway Backend: https://eos-platform-production.up.railway.app/api/v1
- Client Subdomains: https://[client].axplatform.app

## Common Commands
```bash
# Backend
cd backend
npm run lint        # Lint backend code
npm run typecheck   # Type check (if available)

# Frontend
cd frontend
npm run lint        # Lint frontend code
npm run build       # Build for production
```

## Database Best Practices

### Database Management
- **User uses pgAdmin** for database management
- Always provide raw SQL code that can be copied and pasted into pgAdmin
- Include any necessary migration scripts as standalone SQL files

### Creating Organizations - CRITICAL
```sql
-- ✅ CORRECT: Use gen_random_uuid() for Leadership Team
INSERT INTO teams (id, name, organization_id, is_leadership_team)
VALUES (gen_random_uuid(), 'Leadership Team', <org_id>, true);

-- ❌ WRONG: Never reuse special UUIDs across orgs
```

### Business Blueprint Requirements
- **MUST have `team_id = NULL`** for organization-level blueprints
- API looks for `team_id IS NULL`, not Leadership Team UUID

### Scorecard Metrics Requirements
- **MUST have `owner` field populated** to display in UI
- Fix: `UPDATE scorecard_metrics SET owner = 'Team Name' WHERE owner IS NULL;`

## Trademark Compliance Renames
- **vtos** → **business_blueprints**
- **rocks** → **quarterly_priorities**
- **eosi_organizations** → **consultant_organizations**
- Core values still use `vto_id` column (references `business_blueprints.id`)

## UI/UX Design System

### Core Design Elements
- **Background**: Gradient from `slate-50` via `blue-50/30` to `indigo-50/30`
- **Cards**: `white/80` with `backdrop-blur-sm` for glass-morphism
- **Borders**: `border-white/50` for subtle definition
- **Theme Colors**: Respect organization's custom colors

### Standard Patterns
```jsx
// Card Component
<div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
  {/* Content */}
</div>

// Theme-Aware Gradient
style={{
  background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.secondary} 100%)`
}}
```

## Development Guidelines

1. **Always use PostgreSQL** for data persistence
2. **Never rely on local filesystem** for storage
3. **Test features with Railway deployments** in mind
4. **Follow ES6 module syntax** in backend
5. **Run lint before committing**
6. **Check App.jsx imports** before modifying components
7. **Respect organization theme colors** in UI
8. **Update existing files** rather than creating new versions

## Common Fixes & Patterns

### Logo Management
- **Logo Size Control**: Use `logoSize` state from localStorage, apply as percentage to base dimensions
- **Prevent Flash on Navigation**: Set `logoKey` once on mount, don't update on route changes
- **Base Dimensions**: 96px height, 300px max width at 100%

### React Component Issues
- **"X is not a function" Error**: Usually missing or incorrect hook destructuring
- **Layout Double-Wrapping**: Page components shouldn't import Layout if already wrapped in App.jsx
- **Terminology Hook**: Use `const { labels } = useTerminology()` not `getTerminology`

### Database Foreign Keys
- **User References**: Always use UUID type, not INTEGER
- **Organization References**: Always use UUID type
- **Check Existing Tables**: Run queries to verify column types before creating foreign keys

### Stripe Webhook Fix (Critical)
- **Issue**: "No stripe-signature header value was provided"
- **Cause**: Webhook routes must come BEFORE express.json() middleware
- **Solution**: In server.js, place webhook routes before body parsing:
```javascript
app.use('/api/v1/webhooks', webhookRoutes);  // Raw body needed
app.use(express.json());                      // Then parse JSON
```

## Important File References

### For Detailed Documentation
- **Historical Issues**: See `CLAUDE_ARCHIVE.md`
- **OAuth Setup**: See `docs/setup/oauth.md`
- **Cloud Storage**: See `docs/setup/cloud-storage.md`
- **Creating Orgs**: See `docs/migrations/creating-organizations.md`
- **Build Optimization**: See `docs/features/netlify-build-optimization.md`

### Key Migration Files
- Special UUID migration: `SPECIAL_UUID_MIGRATION_GUIDE.md`
- Boyum org template: `migrate_boyum_simple.sql`
- Scorecard precision fix: `fix_scorecard_decimal_precision.sql`

## Recent Active Features

### Apollo.io Integration Decision (Aug 2024)
- **Decision**: Use Apollo's native features instead of complex database sync
- **Simplified Approach**: Remove prospect tables and sync infrastructure
- **Use Apollo For**: Email campaigns, website visitor tracking, lead scoring
- **Custom Tracking Domain**: track.axplatform.app configured in Netlify DNS

### Process Documentation System (Aug 2024)
- Comprehensive process management for EOS Core Processes, Scaling Up Process Maps, 4DX Standard Work, OKR Playbooks
- Supports both internal PostgreSQL storage and external cloud providers
- Features: templates, version tracking, acknowledgments, review schedules
- Migration: `create_process_documentation_tables.sql`
- Routes: `/api/v1/processes` 
- **Fix Applied**: User foreign keys must be UUID, not INTEGER

### Adaptive Framework Technology™
- Organizations can switch between EOS, 4DX, OKRs, Scaling Up methodologies
- Dynamic terminology throughout platform (menu items change based on methodology)
- Default preset available for reverting to methodology-agnostic terms
- **Terminology Defaults**: 
  - "Metrics" instead of "Scorecard" (EOS-specific)
  - "Tasks" instead of "To-Dos" (more professional)
  - "Processes" for generic, changes to "Core Processes" for EOS, etc.
- **Fix Applied**: Terminology presets must include `processes_label` and `process_singular`

### Cloud Storage Integration
- Google Drive, OneDrive, SharePoint support
- Storage Factory Pattern with provider adapters
- Complete data sovereignty for organizations

### OAuth Authentication
- Google and Microsoft OAuth 2.0
- Multi-tenant support
- Auto-links accounts by email

### Export Functionality
- Excel export for organization data
- PDF export capabilities
- Comprehensive backup options

## Environment Variables Required
```bash
# Core
JWT_SECRET=your-secret
DATABASE_URL=postgresql://...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

# Stripe (CRITICAL - must be set for webhooks)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # Get from Stripe Dashboard > Webhooks

# Optional
OPENAI_API_KEY=...  # For AI features
ENABLE_MEETINGS=true # For collaborative meetings
```

## Marketing & Apollo Integration (Aug 2024)

### Strategic Decision: Apollo-Only Workflow
**Simplified from**: PhantomBuster → AXP Database → Apollo → Import back  
**To**: PhantomBuster → Apollo (direct upload) → Email campaigns

**Why**: Apollo IS the prospect CRM. No need to duplicate data in AXP.

### Apollo Configuration
- **Website Tracking**: `appId: 68aa0c1fd256ed000d90dd16` in index.html
- **Custom Domain**: `track.axplatform.app` → `brainy-figs.aploconnects.com`
- **Email**: `eric@axplatform.app` via Google Workspace
- **DNS Records Added to Netlify**:
  - MX: `SMTP.GOOGLE.COM`
  - SPF: `v=spf1 include:_spf.google.com ~all`
  - DKIM: Auto-configured by Apollo
  - CNAME: track → brainy-figs.aploconnects.com

### Apollo Best Practices
1. **Custom tracking domain CRITICAL**: 50-70% better deliverability
2. **Email warmup schedule**: Week 1: 20-30/day, Week 2: 50-75/day, Week 3: 100-150/day
3. **Web upload vs API**: Web found 160/200 (80%), API found 1/459 (0.2%)
4. **Target metrics**: 25-35% open rate, 3-5% click rate

### Current Marketing Assets
- 580 EOS Integrators identified via PhantomBuster
- 160 enriched with emails via Apollo web upload
- Website visitor tracking configured
- Conversion tracking on registration/landing pages

## Critical Webhook Configuration

### ⚠️ Stripe Webhooks MUST Come Before Body Parsing
```javascript
// ✅ CORRECT ORDER in server.js
app.use('/api/v1/webhooks', webhookRoutes);  // Raw body for Stripe signature
app.use(express.json());                      // Then parse for other routes

// ❌ WRONG ORDER - breaks Stripe signature verification
app.use(express.json());                      // Parses body first
app.use('/api/v1/webhooks', webhookRoutes);  // Too late, body already parsed!
```

This caused a 3-day production outage (Aug 20-23, 2024) where payments processed but database wasn't updated.

## Removed Features (Aug 2024)
- Prospect tracking database (6,655 lines removed)
- PhantomBuster integration 
- Apollo enrichment API
- `/sales-intelligence` route
- Use Apollo directly instead

---
**Note**: This is a streamlined essential reference. For historical context and detailed guides, see the archive and docs folder.