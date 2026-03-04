import { ConfidentialClientApplication } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';
import failedOperationsService from '../services/failedOperationsService.js';

// Check if Microsoft OAuth is configured
const isMicrosoftOAuthConfigured = () => {
  return process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET;
};

// Microsoft OAuth configuration
const getMsalConfig = () => ({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`, // Use 'common' for multi-tenant
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: 'Error',
    },
  },
});

// Create MSAL application instance only when configured
const getMsalClient = () => {
  if (!isMicrosoftOAuthConfigured()) {
    throw new Error('Microsoft OAuth not configured');
  }
  return new ConfidentialClientApplication(getMsalConfig());
};

// Generate JWT tokens (access + refresh) matching the standard login flow
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      organizationId: user.organization_id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// Get Microsoft OAuth URL
export const getMicrosoftAuthUrl = async (req, res) => {
  try {
    if (!isMicrosoftOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Microsoft OAuth not configured'
      });
    }

    const state = req.query.redirect_url || req.headers.referer || 'https://axplatform.app';
    
    console.log('🔵 Generating Microsoft OAuth URL');
    console.log('📍 Redirect URL (state):', state);
    console.log('📍 Callback URL:', process.env.MICROSOFT_CALLBACK_URL);
    
    const authCodeUrlParameters = {
      scopes: ['user.read', 'email', 'profile', 'openid'],
      redirectUri: process.env.MICROSOFT_CALLBACK_URL,
      state: state
    };

    const msalClient = getMsalClient();
    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    
    console.log('✅ Auth URL generated:', authUrl.substring(0, 100) + '...');
    
    res.json({ 
      success: true,
      authUrl 
    });
  } catch (error) {
    console.error('❌ Error generating Microsoft auth URL:', error);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'microsoft_auth_url',
      error,
      { 
        provider: 'microsoft',
        action: 'generate_url'
      }
    );
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate authentication URL' 
    });
  }
};

// Handle Microsoft OAuth callback
export const handleMicrosoftCallback = async (req, res) => {
  try {
    if (!isMicrosoftOAuthConfigured()) {
      const redirectUrl = req.query.state || 'https://axplatform.app';
      return res.redirect(`${redirectUrl}/login?error=oauth_not_configured`);
    }

    // Get code from query params (Microsoft sends it in the URL)
    const { code, state, error, error_description } = req.query;
    
    console.log('🔵 Microsoft callback received');
    console.log('📦 Query params:', { 
      code: code ? 'present' : 'missing', 
      state,
      error 
    });
    
    // Handle Microsoft errors
    if (error) {
      console.error('❌ Microsoft OAuth error:', error, error_description);
      const redirectUrl = state || 'https://axplatform.app';
      return res.redirect(`${redirectUrl}/login?error=${error}`);
    }
    
    // Validate code
    if (!code) {
      console.error('❌ No authorization code provided');
      const redirectUrl = state || 'https://axplatform.app';
      return res.redirect(`${redirectUrl}/login?error=no_code`);
    }
    
    console.log('🔄 Exchanging code for tokens...');
    
    // Exchange code for tokens
    const tokenRequest = {
      code: code,
      scopes: ['user.read', 'email', 'profile', 'openid'],
      redirectUri: process.env.MICROSOFT_CALLBACK_URL,
    };

    const msalClient = getMsalClient();
    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
    
    console.log('✅ Token acquired successfully');
    console.log('🔍 Access token:', tokenResponse.accessToken ? 'present' : 'missing');
    
    // Get user info from Microsoft Graph API
    console.log('📡 Fetching user profile from Microsoft Graph...');
    
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`
      }
    });

    const microsoftUser = await graphResponse.json();
    
    console.log('✅ Microsoft user profile retrieved:', {
      id: microsoftUser.id,
      displayName: microsoftUser.displayName,
      email: microsoftUser.mail || microsoftUser.userPrincipalName
    });
    
    // Extract email (Microsoft uses different fields)
    const email = microsoftUser.mail || microsoftUser.userPrincipalName || microsoftUser.email;
    
    if (!email) {
      console.error('❌ No email found in Microsoft user profile');
      const redirectUrl = state || 'https://axplatform.app';
      return res.redirect(`${redirectUrl}/login?error=no_email`);
    }
    
    console.log('📧 Email extracted:', email);
    
    // Check if user already exists
    console.log('🔍 Looking for existing user with email:', email);
    
    let userResult = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    let user;
    
    if (userResult.rows.length > 0) {
      // Existing user - update their Microsoft ID if not set
      user = userResult.rows[0];
      console.log('✅ Existing user found:', user.id);
      console.log('📊 User data from database:', {
        id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        microsoft_id: user.microsoft_id
      });
      
      if (!user.microsoft_id) {
        await db.query(
          'UPDATE users SET microsoft_id = $1, oauth_provider = $2, updated_at = NOW() WHERE id = $3',
          [microsoftUser.id, 'microsoft', user.id]
        );
        console.log('✅ Updated user with Microsoft ID');
      }
    } else {
      // 🔒 SECURITY FIX: OAuth only works for pre-created users
      // New users must be manually created by administrators first
      
      console.log('🔒 User not found in database:', email);
      console.log('❌ OAuth login denied - user must be created by administrator first');
      
      // Determine base URL for error redirect
      let baseUrl = 'https://axplatform.app';
      if (state && state.includes('myboyum')) {
        baseUrl = 'https://myboyum.axplatform.app';
      }
      
      // Redirect with clear error message
      return res.redirect(
        `${baseUrl}/login?error=user_not_found&message=${encodeURIComponent('Your account has not been created yet. Please contact your administrator to set up your account.')}`
      );
    }

    // Update last login and track for daily active users
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Track login for daily active users report
    await db.query(
      `INSERT INTO user_login_tracking (user_id, organization_id, ip_address, user_agent, auth_method)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.organization_id, req.ip, req.get('user-agent'), 'microsoft']
    ).catch(err => console.error('Failed to track login:', err));
    
    // Track successful OAuth
    global.lastOAuthSuccess = Date.now();

    // Ensure we have a valid user object
    if (!user || !user.id) {
      console.error('❌ Invalid user object:', user);
      let baseUrl = 'https://axplatform.app';
      if (state && state.includes('myboyum')) {
        baseUrl = 'https://myboyum.axplatform.app';
      }
      return res.redirect(`${baseUrl}/login?error=invalid_user`);
    }
    
    // Generate JWT token
    console.log('🔑 User object before token generation:', {
      id: user.id,
      email: user.email,
      organization_id: user.organization_id,
      has_user: !!user,
      user_keys: user ? Object.keys(user) : []
    });
    
    const { accessToken, refreshToken } = generateTokens(user);
    console.log('✅ JWT tokens generated (access + refresh)');
    
    // Decode and log the token payload for debugging
    try {
      const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
      console.log('🎫 Token payload:', payload);
    } catch (e) {
      console.error('Failed to decode token for logging');
    }
    
    // Determine base URL for redirect (handle subdomains)
    let baseUrl = 'https://axplatform.app';
    if (state && state.includes('myboyum')) {
      baseUrl = 'https://myboyum.axplatform.app';
    }
    
    // ALWAYS redirect to the correct path: /login/auth/callback
    // Pass both access and refresh tokens so background refresh works during meetings
    const redirectWithToken = `${baseUrl}/login/auth/callback?token=${accessToken}&refreshToken=${refreshToken}&provider=microsoft`;
    console.log('🔄 Redirecting to:', redirectWithToken);
    
    res.redirect(redirectWithToken);
    
  } catch (error) {
    console.error('❌ Microsoft OAuth callback error:', error);
    console.error('Stack:', error.stack);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'microsoft_callback',
      error,
      { 
        provider: 'microsoft',
        action: 'callback',
        email: req.query?.email,
        critical: true
      }
    );
    
    // Update global tracking
    global.lastOAuthError = Date.now();
    
    // Redirect to login with error - use clean base URL
    let baseUrl = 'https://axplatform.app';
    if (req.query.state && req.query.state.includes('myboyum')) {
      baseUrl = 'https://myboyum.axplatform.app';
    }
    res.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
};

// Link existing account with Microsoft
export const linkMicrosoftAccount = async (req, res) => {
  try {
    if (!isMicrosoftOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Microsoft OAuth not configured'
      });
    }

    // User must be authenticated to link account
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Must be logged in to link account' 
      });
    }

    const authCodeUrlParameters = {
      scopes: ['user.read', 'email', 'profile', 'openid'],
      redirectUri: process.env.MICROSOFT_CALLBACK_URL,
      state: JSON.stringify({ 
        action: 'link',
        userId: req.user.id,
        redirect: req.headers.referer 
      })
    };

    const msalClient = getMsalClient();
    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error linking Microsoft account:', error);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'microsoft_link_account',
      error,
      { 
        provider: 'microsoft',
        action: 'link',
        userId: req.user?.id
      }
    );
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link Microsoft account' 
    });
  }
};