const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

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

// Get Google OAuth URL
export const getGoogleAuthUrl = (req, res) => {
  try {
    const authorizeUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      // Include the original domain in state if it's a subdomain
      state: req.headers.referer || 'https://axplatform.app'
    });

    res.json({ authUrl: authorizeUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate authentication URL' 
    });
  }
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (req, res) => {
  const { code, state } = req.body;

  try {
    // Exchange code for tokens
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
      // New user - create account
      // First, check if there's an organization with this email domain
      const emailDomain = googleUser.email.split('@')[1];
      
      // Try to find an organization (simplified - you may want to enhance this)
      let orgResult = await db.query(
        'SELECT id FROM organizations LIMIT 1'
      );
      
      if (orgResult.rows.length === 0) {
        // No organization exists - they need to register properly
        return res.redirect(
          `${state || 'https://axplatform.app'}/register?email=${encodeURIComponent(googleUser.email)}&name=${encodeURIComponent(googleUser.name)}`
        );
      }
      
      const organizationId = orgResult.rows[0].id;
      
      // Create new user
      const newUserResult = await db.query(
        `INSERT INTO users (
          email, 
          first_name, 
          last_name, 
          password_hash,
          organization_id, 
          role,
          google_id,
          email_verified,
          created_at, 
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
        RETURNING *`,
        [
          googleUser.email,
          googleUser.given_name || googleUser.name?.split(' ')[0] || '',
          googleUser.family_name || googleUser.name?.split(' ')[1] || '',
          await bcrypt.hash(Math.random().toString(36), 10), // Random password for OAuth users
          organizationId,
          'member', // Default role
          googleUser.id,
          true // Google emails are pre-verified
        ]
      );
      
      user = newUserResult.rows[0];
      
      // Add to default team (Leadership Team)
      await db.query(
        `INSERT INTO team_members (user_id, team_id, role, joined_at)
         VALUES ($1, '00000000-0000-0000-0000-000000000000', 'member', NOW())`,
        [user.id]
      );
    }

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
    console.error('Google OAuth callback error:', error);
    
    // Redirect to login with error
    const redirectUrl = state || 'https://axplatform.app';
    res.redirect(`${redirectUrl}/login?error=oauth_failed`);
  }
};

// Link existing account with Google
export const linkGoogleAccount = async (req, res) => {
  try {
    // User must be authenticated to link account
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Must be logged in to link account' 
      });
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link Google account' 
    });
  }
};