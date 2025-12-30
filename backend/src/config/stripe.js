import Stripe from 'stripe';

// Initialize Stripe with your secret key
// In production, use environment variable: process.env.STRIPE_SECRET_KEY
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY');

// Stripe price IDs for different plans
// Note: This should be a per-seat price ID from Stripe Dashboard
const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_1Rj5XuK5ClkyxluBanf9wvuL', // Legacy per-user pricing (migrating to flat-rate)
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_YOUR_ENTERPRISE_PRICE_ID',
  custom: process.env.STRIPE_CUSTOM_PRICE_ID || 'price_1Sk6EeK5ClkyxluBGHd8lZe7' // Custom $500/month flat rate
};

// Webhook secret for validating Stripe webhooks
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET';

export {
  stripe,
  STRIPE_PRICES,
  STRIPE_WEBHOOK_SECRET
};