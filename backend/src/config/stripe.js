const Stripe = require('stripe');

// Initialize Stripe with your secret key
// In production, use environment variable: process.env.STRIPE_SECRET_KEY
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY');

// Stripe price IDs for different plans
// Note: This should be a per-seat price ID from Stripe Dashboard
const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_YOUR_PRO_PRICE_ID', // $5/user/month
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_YOUR_ENTERPRISE_PRICE_ID'
};

// Webhook secret for validating Stripe webhooks
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET';

module.exports = {
  stripe,
  STRIPE_PRICES,
  STRIPE_WEBHOOK_SECRET
};