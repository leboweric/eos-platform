# OAuth Authentication Setup Guide

## Overview
OAuth 2.0 authentication for Google and Microsoft accounts, allowing users to sign in without passwords.

## Frontend Components
- **Login/Register Pages**: "Continue with Google" and "Continue with Microsoft" buttons
- **OAuth Service** (`/frontend/src/services/oauthService.js`): Handles OAuth redirects and callbacks
- **OAuth Callback Page** (`/frontend/src/pages/OAuthCallback.jsx`): Processes OAuth success/failure
- **Subdomain Routing**: Client-specific subdomains redirect directly to login

## Backend Implementation
- **Google OAuth Controller** (`/backend/src/controllers/oauthController.js`):
  - Uses `google-auth-library` package
  - Exchanges authorization codes for tokens
  - Creates/links user accounts based on email
  
- **Microsoft OAuth Controller** (`/backend/src/controllers/microsoftOAuthController.js`):
  - Uses `@azure/msal-node` package  
  - Multi-tenant configuration for any Microsoft account
  - Special handling for myboyum.com domain users

## Database Schema
OAuth fields in users table (migration 049_add_oauth_fields.sql):
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN microsoft_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

## OAuth Flow
1. User clicks OAuth button → Frontend requests auth URL from backend
2. Backend generates OAuth URL with proper scopes and redirect URI
3. User authenticates with provider → Provider redirects to callback URL
4. Backend exchanges code for tokens and user info
5. Creates/updates user account and generates JWT
6. Redirects to frontend with token

## Configuration

### Environment Variables Required
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://api.axplatform.app/api/v1/auth/google/callback

# Microsoft OAuth  
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_CALLBACK_URL=https://api.axplatform.app/api/v1/auth/microsoft/callback
```

### Google Cloud Console Setup
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URI: `https://api.axplatform.app/api/v1/auth/google/callback`
3. Enable Google+ API

### Microsoft Azure Setup
1. Register app in Azure Portal
2. Set as multi-tenant (Accounts in any organizational directory)
3. Add redirect URI: `https://api.axplatform.app/api/v1/auth/microsoft/callback`
4. Create client secret

## Custom Domain Configuration
- Created `api.axplatform.app` subdomain pointing to Railway backend
- Required because Google OAuth doesn't accept Railway URLs for production
- DNS CNAME record: `api.axplatform.app` → Railway deployment URL

## Important Implementation Notes

### ES6 Module Syntax
Backend uses ES6 modules (`"type": "module"` in package.json):
```javascript
// ✅ Correct
import express from 'express';

// ❌ Wrong - will cause deployment failure
const express = require('express');
```

### Organization Assignment
- OAuth users are automatically assigned to first available organization
- myboyum.com emails are specifically assigned to Boyum organization
- New users without orgs are redirected to registration

### Account Linking
- Existing users can link OAuth accounts
- Email address is used as the unique identifier
- Multiple OAuth providers can be linked to same account

## Testing OAuth Endpoints
```bash
# Check Google OAuth
curl https://api.axplatform.app/api/v1/auth/google

# Check Microsoft OAuth  
curl https://api.axplatform.app/api/v1/auth/microsoft
```

## Common Issues and Solutions

1. **Invalid Grant Error in Logs**
   - Normal when testing with invalid codes
   - Production users with valid codes won't see this

2. **Redirect URI Mismatch**
   - Ensure callback URLs match exactly in provider console
   - Include `/api/v1` in the path

3. **CORS Issues**
   - Frontend uses proxy configuration for local development
   - Production uses proper domain configuration