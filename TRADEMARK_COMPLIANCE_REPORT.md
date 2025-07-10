# Trademark Compliance Report - EOS Platform

## Summary
This report provides a comprehensive list of all trademarked terms found in the codebase that need to be replaced for legal compliance.

## Trademarked Terms Found

### 1. "EOS" (83 occurrences across 18 files)
- **Backend Files:**
  - `/backend/src/services/emailService.js` - 13 occurrences
  - `/backend/src/migrations/004_add_eosi_support.sql` - 1 occurrence
  - `/backend/package.json` - 3 occurrences
  - `/backend/database/migrations/001_initial_schema.sql` - 2 occurrences
  - `/backend/database/migrations/002_departments_and_accountability.sql` - 2 occurrences
  - `/backend/package-lock.json` - 2 occurrences

- **Frontend Files:**
  - `/frontend/index.html` - 1 occurrence
  - `/frontend/src/pages/VTOPage.jsx` - 5 occurrences
  - `/frontend/src/components/TrialBanner.jsx` - 1 occurrence
  - `/frontend/src/pages/LandingPage.jsx` - 18 occurrences
  - `/frontend/src/components/Layout.jsx` - 3 occurrences
  - `/frontend/src/pages/RegisterPage.jsx` - 4 occurrences
  - `/frontend/src/pages/EOSIRegisterPage.jsx` - 9 occurrences
  - `/frontend/src/pages/LoginPage.jsx` - 4 occurrences
  - `/frontend/src/pages/EOSIDashboard.jsx` - 2 occurrences
  - `/frontend/src/pages/Dashboard.jsx` - 2 occurrences

- **Documentation:**
  - `/DEPLOYMENT.md` - 4 occurrences
  - `/README.md` - 7 occurrences

### 2. "EOSI" (53 occurrences across 17 files)
- **Backend Files:**
  - `/backend/src/routes/eosiRoutes.js` - 2 occurrences
  - `/backend/src/server.js` - 1 occurrence
  - `/backend/src/controllers/authController.js` - 2 occurrences
  - `/backend/src/middleware/auth.js` - 2 occurrences
  - `/backend/src/migrations/004_add_eosi_support.sql` - 4 occurrences
  - `/backend/src/controllers/eosiController.js` - 10 occurrences
  - `/backend/src/controllers/userController.js` - 3 occurrences
  - `/backend/src/migrations/003_create_invitations_table.sql` - 1 occurrence

- **Frontend Files:**
  - `/frontend/src/App.jsx` - 2 occurrences
  - `/frontend/src/pages/LandingPage.jsx` - 2 occurrences
  - `/frontend/src/pages/RegisterPage.jsx` - 4 occurrences
  - `/frontend/src/stores/authStore.js` - 1 occurrence
  - `/frontend/src/pages/LoginPage.jsx` - 2 occurrences
  - `/frontend/src/pages/EOSIRegisterPage.jsx` - 6 occurrences
  - `/frontend/src/pages/EOSIDashboard.jsx` - 4 occurrences
  - `/frontend/src/pages/Dashboard.jsx` - 2 occurrences
  - `/frontend/src/components/Layout.jsx` - 5 occurrences

### 3. "Rocks" (60 occurrences across 16 files)
- **Backend Files:**
  - `/backend/src/routes/rocks.js` - 1 occurrence
  - `/backend/src/routes/departmentRoutes.js` - 3 occurrences
  - `/backend/src/server.js` - 2 occurrences
  - `/backend/src/controllers/rocksController.js` - 11 occurrences
  - `/backend/src/controllers/eosiController.js` - 5 occurrences
  - `/backend/database/migrations/002_departments_and_accountability.sql` - 2 occurrences
  - `/backend/database/migrations/001_initial_schema.sql` - 8 occurrences

- **Frontend Files:**
  - `/frontend/src/App.jsx` - 1 occurrence
  - `/frontend/src/pages/VTOPage.jsx` - 4 occurrences
  - `/frontend/src/pages/LandingPage.jsx` - 2 occurrences
  - `/frontend/src/pages/Dashboard.jsx` - 5 occurrences
  - `/frontend/src/pages/EOSIDashboard.jsx` - 2 occurrences
  - `/frontend/src/components/Layout.jsx` - 1 occurrence
  - `/frontend/src/pages/RocksPage.jsx` - 10 occurrences
  - `/frontend/src/pages/EOSIRegisterPage.jsx` - 1 occurrence

- **Documentation:**
  - `/README.md` - 2 occurrences

### 4. "VTO" and "V/TO" (72 occurrences across 11 files)
- **Backend Files:**
  - `/backend/src/routes/vto.js` - 1 occurrence
  - `/backend/src/routes/departmentRoutes.js` - 2 occurrences
  - `/backend/src/server.js` - 2 occurrences
  - `/backend/src/controllers/vtoController.js` - 48 occurrences
  - `/backend/src/controllers/eosiController.js` - 1 occurrence
  - `/backend/database/migrations/001_initial_schema.sql` - 2 occurrences

- **Frontend Files:**
  - `/frontend/src/pages/VTOPage.jsx` - 11 occurrences
  - `/frontend/src/pages/LandingPage.jsx` - 1 occurrence
  - `/frontend/src/components/Layout.jsx` - 1 occurrence
  - `/frontend/src/App.jsx` - 1 occurrence

- **Documentation:**
  - `/README.md` - 2 occurrences

### 5. "Level 10" and "L10" (5 occurrences across 3 files)
- **Frontend Files:**
  - `/frontend/src/pages/LandingPage.jsx` - 2 occurrences
  - `/frontend/src/pages/Dashboard.jsx` - 1 occurrence

- **Documentation:**
  - `/README.md` - 2 occurrences

### 6. "@eosworldwide.com" (9 occurrences across 5 files)
- **Backend Files:**
  - `/backend/src/controllers/authController.js` - 1 occurrence
  - `/backend/src/migrations/004_add_eosi_support.sql` - 1 occurrence

- **Frontend Files:**
  - `/frontend/src/pages/EOSIRegisterPage.jsx` - 5 occurrences
  - `/frontend/src/pages/RegisterPage.jsx` - 1 occurrence
  - `/frontend/src/pages/LoginPage.jsx` - 1 occurrence

## Areas of Concern

### Component/Route Names
- `EOSIDashboard` component
- `EOSIRegisterPage` component
- `/eosi` routes
- `/vto` routes
- `/rocks` routes

### Variable Names
- `isEOSI`, `is_eosi` (user properties)
- `vto_id`, `vtoId` (database fields)
- `rocks` (in various contexts)

### Database Tables and Fields
- `vtos` table
- `rocks` table
- `is_eosi` column in users table
- `eosi_email` column
- VTO-related tables: `core_values`, `core_focus`, `ten_year_targets`, etc.

### UI Text
- Email templates containing "EOS Platform", "EOS Implementer"
- Landing page content with multiple references
- Button labels and navigation items

### Configuration
- Package names
- Email addresses (@eosworldwide.com)

## Recommended Actions

1. **Database Migration**: Create new migration scripts to rename tables and columns
2. **Global Find/Replace**: Systematic replacement of terms across all files
3. **Component Renaming**: Rename React components and update imports
4. **Route Updates**: Change API and frontend routes
5. **Email Template Updates**: Replace all email content with new terminology
6. **Documentation Updates**: Update all README and deployment docs
7. **Configuration Updates**: Update package.json and environment variables

## Critical Files Requiring Immediate Attention

1. `/backend/src/controllers/vtoController.js` - 48 VTO occurrences
2. `/frontend/src/pages/LandingPage.jsx` - 18 EOS occurrences
3. `/backend/src/services/emailService.js` - 13 EOS occurrences
4. `/backend/src/controllers/rocksController.js` - 11 Rocks occurrences
5. `/frontend/src/pages/RocksPage.jsx` - 10 Rocks occurrences