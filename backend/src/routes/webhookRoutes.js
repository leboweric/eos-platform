const express = require('express');
const router = express.Router();
const { stripe, STRIPE_WEBHOOK_SECRET } = require('../config/stripe');
const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');

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
  const subscription = await Subscription.findOne({ stripeCustomerId: invoice.customer });
  if (!subscription) return;

  subscription.lastPaymentStatus = 'succeeded';
  subscription.lastPaymentAmount = invoice.amount_paid / 100;
  subscription.lastPaymentDate = new Date();
  subscription.status = 'active';
  await subscription.save();

  // Ensure organization is marked as active
  const organization = await Organization.findById(subscription.organization);
  if (organization) {
    organization.hasActiveSubscription = true;
    await organization.save();
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice) {
  const subscription = await Subscription.findOne({ stripeCustomerId: invoice.customer });
  if (!subscription) return;

  subscription.lastPaymentStatus = 'failed';
  subscription.status = 'past_due';
  await subscription.save();

  // Here you would send a payment failure email
  console.log(`Payment failed for subscription ${subscription._id}`);
}

// Handle subscription updates
async function handleSubscriptionUpdated(stripeSubscription) {
  const subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
  if (!subscription) return;

  subscription.status = stripeSubscription.status;
  subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
  subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
  
  // Update user count if quantity changed
  if (stripeSubscription.items && stripeSubscription.items.data[0]) {
    subscription.userCount = stripeSubscription.items.data[0].quantity;
    subscription.stripeSubscriptionItemId = stripeSubscription.items.data[0].id;
  }
  
  if (stripeSubscription.cancel_at_period_end) {
    subscription.canceledAt = new Date();
  }
  
  await subscription.save();
}

// Handle subscription deletion
async function handleSubscriptionDeleted(stripeSubscription) {
  const subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
  if (!subscription) return;

  subscription.status = 'canceled';
  subscription.canceledAt = new Date();
  await subscription.save();

  // Update organization
  const organization = await Organization.findById(subscription.organization);
  if (organization) {
    organization.hasActiveSubscription = false;
    await organization.save();
  }
}

module.exports = router;