import express from 'express';
const router = express.Router();
import { authenticate, authorize } from '../middleware/auth.js';
import {
  startTrial,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory
} from '../controllers/subscriptionController.js';

// All routes require authentication
router.use(authenticate);

// Get subscription status
router.get('/status', getSubscriptionStatus);

// Get billing history
router.get('/billing-history', getBillingHistory);

// Start trial (requires admin)
router.post('/start-trial', authorize('admin'), startTrial);

// Cancel subscription (requires admin)
router.post('/cancel', authorize('admin'), cancelSubscription);

// Update payment method (requires admin)
router.put('/payment-method', authorize('admin'), updatePaymentMethod);

export default router;