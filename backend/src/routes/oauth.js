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

const router = express.Router();

// Google OAuth routes
router.get('/google', getGoogleAuthUrl);
router.post('/google/callback', handleGoogleCallback);
router.post('/google/link', authenticate, linkGoogleAccount);

// Microsoft OAuth routes
router.get('/microsoft', getMicrosoftAuthUrl);
router.post('/microsoft/callback', handleMicrosoftCallback);
router.post('/microsoft/link', authenticate, linkMicrosoftAccount);

export default router;