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

### Adaptive Framework Technology™
- Organizations can switch between EOS, 4DX, OKRs, Scaling Up methodologies
- `useTerminology` hook provides framework-specific terms
- Organization setting: `terminology_set` field

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

# Optional
OPENAI_API_KEY=...  # For AI features
ENABLE_MEETINGS=true # For collaborative meetings
```

---
**Note**: This is a streamlined essential reference. For historical context and detailed guides, see the archive and docs folder.