import express from 'express';
const router = express.Router();
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';
import { query } from '../config/database.js';

// Stripe webhook endpoint (no auth middleware - Stripe will validate)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
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
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle successful payment
async function handlePaymentSucceeded(invoice) {
  const result = await query(
    'SELECT * FROM subscriptions WHERE stripe_customer_id = $1',
    [invoice.customer]
  );
  
  if (result.rows.length === 0) return;

  const subscription = result.rows[0];

  await query(
    `UPDATE subscriptions 
     SET last_payment_status = 'succeeded',
         last_payment_amount = $1,
         last_payment_date = NOW(),
         status = 'active'
     WHERE id = $2`,
    [invoice.amount_paid / 100, subscription.id]
  );

  // Ensure organization is marked as active
  await query(
    'UPDATE organizations SET has_active_subscription = true WHERE id = $1',
    [subscription.organization_id]
  );
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

  await query(
    `UPDATE subscriptions 
     SET status = $1,
         current_period_start = $2,
         current_period_end = $3,
         user_count = $4,
         stripe_subscription_item_id = $5,
         canceled_at = $6
     WHERE id = $7`,
    [
      stripeSubscription.status,
      new Date(stripeSubscription.current_period_start * 1000),
      new Date(stripeSubscription.current_period_end * 1000),
      userCount,
      stripeSubscription.items.data[0]?.id || subscription.stripe_subscription_item_id,
      stripeSubscription.cancel_at_period_end ? new Date() : null,
      subscription.id
    ]
  );
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