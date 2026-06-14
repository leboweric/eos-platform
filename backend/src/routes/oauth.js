import express from 'express';
import { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
  linkGoogleAccount 
} from '../controllers/oauthController.js';
import {
  getMicrosoftAuthUrl,
  handleMicrosoftCallback,
  linkMicrosoftAccount
} from '../controllers/microsoftOAuthController.js';
import { authenticate } from '../middleware/auth.js';
import { exchangeOAuthCode } from '../controllers/oauthExchangeController.js';

const router = express.Router();

// Exchange one-time OAuth code for tokens (frontend POST only)
router.post('/exchange', exchangeOAuthCode);

// Google OAuth routes
router.get('/google', getGoogleAuthUrl);
router.get('/google/callback', handleGoogleCallback);
router.post('/google/callback', handleGoogleCallback);
router.post('/google/link', authenticate, linkGoogleAccount);

// Microsoft OAuth routes
router.get('/microsoft', getMicrosoftAuthUrl);
router.get('/microsoft/callback', handleMicrosoftCallback);
router.post('/microsoft/link', authenticate, linkMicrosoftAccount);

export default router;