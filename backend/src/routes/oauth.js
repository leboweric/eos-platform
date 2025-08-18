import express from 'express';
import { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
  linkGoogleAccount 
} from '../controllers/oauthController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', getGoogleAuthUrl);
router.post('/google/callback', handleGoogleCallback);
router.post('/google/link', authenticate, linkGoogleAccount);

// Microsoft OAuth routes (placeholder for later)
router.get('/microsoft', (req, res) => {
  res.status(501).json({ 
    success: false, 
    message: 'Microsoft OAuth not yet implemented' 
  });
});

export default router;