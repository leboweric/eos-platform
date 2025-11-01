import express from 'express';
const router = express.Router();
import { stripe, STRIPE_WEBHOOK_SECRET, PLAN_FEATURES, STRIPE_PRICES } from '../config/stripe-flat-rate.js';
import { query } from '../config/database.js';
import { notifyTrialConverted } from '../services/notificationService.js';
import failedOperationsService from '../services/failedOperationsService.js';

// Stripe webhook endpoint (no auth middleware - Stripe will validate)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    
    // Track successful webhook receipt
    global.lastStripeWebhook = Date.now();
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    
    // Log webhook signature failure
    await failedOperationsService.logStripeFailure(
      'signature_verification',
      err,
      {
        critical: true,
        signature: sig ? 'present' : 'missing',
        eventId: req.body?.id
      }
    );
    
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log webhook processing failure
    await failedOperationsService.logStripeFailure(
      event?.type || 'unknown_webhook_type',
      error,
      {
        eventId: event?.id,
        customerId: event?.data?.object?.customer,
        subscriptionId: event?.data?.object?.subscription,
        critical: ['customer.subscription.deleted', 'invoice.payment_failed'].includes(event?.type)
      }
    );
    
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
  const result = await query(
    `SELECT s.*, o.name as organization_name 
     FROM subscriptions s
     JOIN organizations o ON s.organization_id = o.id
     WHERE s.stripe_customer_id = $1`,
    [invoice.customer]
  );
  
  if (result.rows.length === 0) return;

  const subscription = result.rows[0];
  
  // Check if this is the first payment (trial conversion)
  const isFirstPayment = !subscription.last_payment_date || subscription.trial_type === 'trial';

  await query(
    `UPDATE subscriptions 
     SET last_payment_status = 'succeeded',
         last_payment_amount = $1,
         last_payment_date = NOW(),
         status = 'active',
         trial_type = CASE WHEN trial_type = 'trial' THEN 'paid' ELSE trial_type END,
         trial_converted_at = CASE WHEN trial_type = 'trial' THEN NOW() ELSE trial_converted_at END
     WHERE id = $2`,
    [invoice.amount_paid / 100, subscription.id]
  );

  // Ensure organization is marked as active
  await query(
    'UPDATE organizations SET has_active_subscription = true WHERE id = $1',
    [subscription.organization_id]
  );
  
  // Send notification if this is a trial conversion
  if (isFirstPayment && invoice.amount_paid > 0) {
    // Determine plan name from amount or subscription details
    const planInfo = PLAN_FEATURES[subscription.plan_id] || { name: 'Unknown' };
    
    notifyTrialConverted(
      subscription.organization_name,
      planInfo.name,
      invoice.amount_paid / 100
    ).catch(err => console.error('Failed to send conversion notification:', err));
    
    console.log(`🎉 Trial converted to paid: ${subscription.organization_name} - ${planInfo.name} plan`);
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const result = await query(
    'SELECT * FROM subscriptions WHERE stripe_customer_id = $1',
    [invoice.customer]
  );
  
  if (result.rows.length === 0) return;

  const subscription = result.rows[0];

  await query(
    `UPDATE subscriptions 
     SET last_payment_status = 'failed',
         status = 'past_due'
     WHERE id = $1`,
    [subscription.id]
  );

  // Here you would send a payment failure email
  console.log(`Payment failed for subscription ${subscription.id}`);
}

// Helper function to detect billing interval and plan from price ID
function detectPlanAndBilling(priceId) {
  // Reverse lookup from STRIPE_PRICES to find plan and billing interval
  for (const [key, value] of Object.entries(STRIPE_PRICES)) {
    if (value === priceId) {
      const parts = key.split('_');
      const billingInterval = parts[parts.length - 1]; // 'monthly' or 'annual'
      const planId = parts.slice(0, -1).join('_'); // e.g., 'starter', 'growth', etc.
      return { planId, billingInterval };
    }
  }
  return { planId: null, billingInterval: null };
}

// Handle subscription updates
async function handleSubscriptionUpdated(stripeSubscription) {
  const result = await query(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscription.id]
  );
  
  if (result.rows.length === 0) return;

  const subscription = result.rows[0];

  // Update user count if quantity changed
  let userCount = subscription.user_count;
  if (stripeSubscription.items && stripeSubscription.items.data[0]) {
    userCount = stripeSubscription.items.data[0].quantity;
  }

  // Detect plan and billing interval from price ID
  let planId = subscription.plan_id;
  let billingInterval = subscription.billing_interval;
  let pricePerUser = subscription.price_per_user;
  
  if (stripeSubscription.items && stripeSubscription.items.data[0]) {
    const priceId = stripeSubscription.items.data[0].price.id;
    const detected = detectPlanAndBilling(priceId);
    
    if (detected.planId) {
      planId = detected.planId;
      billingInterval = detected.billingInterval;
      
      // Calculate effective monthly price
      const planFeatures = PLAN_FEATURES[planId];
      if (planFeatures) {
        if (billingInterval === 'annual') {
          // For annual billing, calculate the monthly equivalent
          pricePerUser = Math.round((planFeatures.price_annual / 12) * 100) / 100;
        } else {
          pricePerUser = planFeatures.price_monthly;
        }
      }
    }
  }

  await query(
    `UPDATE subscriptions 
     SET status = $1,
         current_period_start = $2,
         current_period_end = $3,
         user_count = $4,
         stripe_subscription_item_id = $5,
         canceled_at = $6,
         plan_id = $7,
         billing_interval = $8,
         price_per_user = $9
     WHERE id = $10`,
    [
      stripeSubscription.status,
      new Date(stripeSubscription.current_period_start * 1000),
      new Date(stripeSubscription.current_period_end * 1000),
      userCount,
      stripeSubscription.items.data[0]?.id || subscription.stripe_subscription_item_id,
      stripeSubscription.cancel_at_period_end ? new Date() : null,
      planId,
      billingInterval,
      pricePerUser,
      subscription.id
    ]
  );
  
  console.log(`Subscription updated: ${subscription.id} - Plan: ${planId} (${billingInterval}) - Monthly rate: $${pricePerUser}`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(stripeSubscription) {
  const result = await query(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
    [stripeSubscription.id]
  );
  
  if (result.rows.length === 0) return;

  const subscription = result.rows[0];

  await query(
    `UPDATE subscriptions 
     SET status = 'canceled',
         canceled_at = NOW()
     WHERE id = $1`,
    [subscription.id]
  );

  // Update organization
  await query(
    'UPDATE organizations SET has_active_subscription = false WHERE id = $1',
    [subscription.organization_id]
  );
}

export default router;