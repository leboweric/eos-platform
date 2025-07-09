const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  startTrial,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory
} = require('../controllers/subscriptionController');

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

module.exports = router;