import express from 'express';
const router = express.Router();
import { authenticate, authorize } from '../middleware/auth.js';
import {
  convertTrialToPaid,
  getAvailablePlans,
  updateSubscription,
  applyPromoCode
} from '../controllers/subscriptionControllerV2.js';

// All routes require authentication
router.use(authenticate);

// Get available plans with pricing (includes user count and recommendations)
router.get('/plans', getAvailablePlans);

// Apply promo code (validates and returns discount info)
router.post('/apply-promo', applyPromoCode);

// Convert trial to paid subscription (requires admin)
router.post('/convert-trial', authorize('admin'), convertTrialToPaid);

// Update subscription (change plan - requires admin)
router.post('/update-plan', authorize('admin'), updateSubscription);

// Get Stripe customer portal URL (for managing billing)
router.post('/portal', authorize('admin'), async (req, res) => {
  try {
    const { stripe } = await import('../config/stripe-flat-rate.js');
    const { query } = await import('../config/database.js');
    
    const organizationId = req.user.organization_id;
    
    // Get the Stripe customer ID
    const result = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );
    
    if (!result.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ 
        error: 'No billing account found',
        message: 'Please complete your subscription setup first'
      });
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: result.rows[0].stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/billing`
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

export default router;