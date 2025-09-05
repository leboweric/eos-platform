import { ConfidentialClientApplication } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';

// Microsoft OAuth configuration
const msalConfig = {
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
};

// Create MSAL application instance
const msalClient = new ConfidentialClientApplication(msalConfig);

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      organizationId: user.organization_id
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// Get Microsoft OAuth URL
export const getMicrosoftAuthUrl = async (req, res) => {
  try {
    const authCodeUrlParameters = {
      scopes: ['user.read', 'email', 'profile', 'openid'],
      redirectUri: process.env.MICROSOFT_CALLBACK_URL,
      state: req.headers.referer || 'https://axplatform.app'
    };

    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Microsoft auth URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate authentication URL' 
    });
  }
};

// Handle Microsoft OAuth callback
export const handleMicrosoftCallback = async (req, res) => {
  const { code, state } = req.body;

  try {
    // Exchange code for tokens
    const tokenRequest = {
      code: code,
      scopes: ['user.read', 'email', 'profile', 'openid'],
      redirectUri: process.env.MICROSOFT_CALLBACK_URL,
    };

    const tokenResponse = await msalClient.acquireTokenByCode(tokenRequest);
    
    // Get user info from Microsoft Graph API
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.accessToken}`
      }
    });

    const microsoftUser = await graphResponse.json();
    
    // Extract email (Microsoft uses different fields)
    const email = microsoftUser.mail || microsoftUser.userPrincipalName || microsoftUser.email;
    
    if (!email) {
      throw new Error('No email found in Microsoft account');
    }
    
    // Check if user already exists
    let userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    let user;
    
    if (userResult.rows.length > 0) {
      // Existing user - update their Microsoft ID if not set
      user = userResult.rows[0];
      
      if (!user.microsoft_id) {
        await db.query(
          'UPDATE users SET microsoft_id = $1, updated_at = NOW() WHERE id = $2',
          [microsoftUser.id, user.id]
        );
      }
    } else {
      // New user - create account
      // Check if there's an organization with this email domain
      const emailDomain = email.split('@')[1];
      
      // For Boyum specifically
      let organizationId;
      if (emailDomain === 'myboyum.com') {
        // Find Boyum's organization
        const orgResult = await db.query(
          "SELECT id FROM organizations WHERE slug = 'boyum-barenscheer' OR name LIKE '%Boyum%' LIMIT 1"
        );
        
        if (orgResult.rows.length > 0) {
          organizationId = orgResult.rows[0].id;
        }
      }
      
      // If no specific org found, try to find any organization
      if (!organizationId) {
        const orgResult = await db.query(
          'SELECT id FROM organizations LIMIT 1'
        );
        
        if (orgResult.rows.length === 0) {
          // No organization exists - redirect to register
          return res.redirect(
            `${state || 'https://axplatform.app'}/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(microsoftUser.displayName || '')}`
          );
        }
        
        organizationId = orgResult.rows[0].id;
      }
      
      // Create new user
      const newUserResult = await db.query(
        `INSERT INTO users (
          email, 
          first_name, 
          last_name, 
          password_hash,
          organization_id, 
          role,
          microsoft_id,
          oauth_provider,
          email_verified,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
        RETURNING *`,
        [
          email,
          microsoftUser.givenName || microsoftUser.displayName?.split(' ')[0] || '',
          microsoftUser.surname || microsoftUser.displayName?.split(' ')[1] || '',
          await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
          organizationId,
          'member', // Default role
          microsoftUser.id,
          'microsoft',
          true // Microsoft emails are pre-verified
        ]
      );
      
      user = newUserResult.rows[0];
      
      // NOTE: Team assignment should be handled by organization admin
      // Not auto-assigning to any team for security reasons
      // Previously this tried to assign to a hardcoded UUID that doesn't exist
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

    // Generate JWT token
    const token = generateToken(user);
    
    // Determine redirect URL based on original domain
    let redirectUrl = 'https://axplatform.app';
    if (state && state.includes('myboyum')) {
      redirectUrl = 'https://myboyum.axplatform.app';
    }
    
    // Redirect to frontend with token
    res.redirect(`${redirectUrl}/auth/success?token=${token}`);
    
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    
    // Redirect to login with error
    const redirectUrl = state || 'https://axplatform.app';
    res.redirect(`${redirectUrl}/login?error=oauth_failed`);
  }
};

// Link existing account with Microsoft
export const linkMicrosoftAccount = async (req, res) => {
  try {
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

    const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error linking Microsoft account:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link Microsoft account' 
    });
  }
};