import express from 'express';
const router = express.Router();
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import {
  startTrial,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory
} from '../controllers/subscriptionController.js';

// All routes require authentication
router.use(auth);

// Get subscription status
router.get('/status', getSubscriptionStatus);

// Get billing history
router.get('/billing-history', getBillingHistory);

// Start trial (requires admin)
router.post('/start-trial', adminAuth, startTrial);

// Cancel subscription (requires admin)
router.post('/cancel', adminAuth, cancelSubscription);

// Update payment method (requires admin)
router.put('/payment-method', adminAuth, updatePaymentMethod);

export default router;