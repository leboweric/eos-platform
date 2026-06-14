import { OAuth2Client } from 'google-auth-library';
import db from '../config/database.js';
import failedOperationsService from '../services/failedOperationsService.js';
import { buildOAuthState, resolveOAuthRedirectBase } from '../utils/oauthRedirect.js';
import { generateOAuthTokens } from '../utils/oauthTokens.js';
import { redirectAfterOAuthLogin } from '../utils/oauthCompletion.js';

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
};

// Initialize Google OAuth client only when configured
const getGoogleClient = () => {
  if (!isGoogleOAuthConfigured()) {
    throw new Error('Google OAuth not configured');
  }
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );
};

// Get Google OAuth URL
export const getGoogleAuthUrl = async (req, res) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Google OAuth not configured'
      });
    }

    const googleClient = getGoogleClient();
    const authorizeUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: buildOAuthState(req)
    });

    res.json({ authUrl: authorizeUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'google_auth_url',
      error,
      { 
        provider: 'google',
        action: 'generate_url'
      }
    );
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate authentication URL' 
    });
  }
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (req, res) => {
  const code = req.body?.code || req.query?.code;
  const state = req.body?.state || req.query?.state;

  try {
    if (!isGoogleOAuthConfigured()) {
      const redirectUrl = resolveOAuthRedirectBase(state);
      return res.redirect(`${redirectUrl}/login?error=oauth_not_configured`);
    }

    if (!code) {
      const redirectUrl = resolveOAuthRedirectBase(state);
      return res.redirect(`${redirectUrl}/login?error=no_code`);
    }

    // Exchange code for tokens
    const googleClient = getGoogleClient();
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    const googleUser = await response.json();
    
    // Check if user already exists
    let userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [googleUser.email]
    );

    let user;
    
    if (userResult.rows.length > 0) {
      // Existing user - update their Google ID if not set
      user = userResult.rows[0];
      
      if (!user.google_id) {
        await db.query(
          'UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2',
          [googleUser.id, user.id]
        );
      }
    } else {
      // OAuth only works for pre-provisioned users (same policy as Microsoft OAuth)
      console.log('🔒 User not found in database:', googleUser.email);
      console.log('❌ Google OAuth login denied - user must be created by administrator first');

      const baseUrl = resolveOAuthRedirectBase(state);
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
      [user.id, user.organization_id, req.ip, req.get('user-agent'), 'google']
    ).catch(err => console.error('Failed to track login:', err));
    
    // Track successful OAuth
    global.lastOAuthSuccess = Date.now();

    const { accessToken, refreshToken } = generateOAuthTokens(user);
    await redirectAfterOAuthLogin(res, {
      accessToken,
      refreshToken,
      user,
      provider: 'google',
      state
    });
    
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'google_callback',
      error,
      { 
        provider: 'google',
        action: 'callback',
        email: googleUser?.email,
        critical: true
      }
    );
    
    // Update global tracking
    global.lastOAuthError = Date.now();
    
    const redirectUrl = resolveOAuthRedirectBase(state);
    res.redirect(`${redirectUrl}/login?error=oauth_failed`);
  }
};

// Link existing account with Google
export const linkGoogleAccount = async (req, res) => {
  try {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Google OAuth not configured'
      });
    }

    // User must be authenticated to link account
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Must be logged in to link account' 
      });
    }

    const googleClient = getGoogleClient();
    const authorizeUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: JSON.stringify({ 
        action: 'link',
        userId: req.user.id,
        redirect: req.headers.referer 
      })
    });

    res.json({ authUrl: authorizeUrl });
  } catch (error) {
    console.error('Error linking Google account:', error);
    
    // Log OAuth failure
    await failedOperationsService.logOAuthFailure(
      'google_link_account',
      error,
      { 
        provider: 'google',
        action: 'link',
        userId: req.user?.id
      }
    );
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link Google account' 
    });
  }
};