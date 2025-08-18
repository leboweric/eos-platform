import Stripe from 'stripe';

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_TEST_KEY');

// Flat-rate pricing tiers (you'll need to create these in Stripe Dashboard)
const STRIPE_PRICES = {
  // Monthly prices
  starter_monthly: process.env.STRIPE_STARTER_MONTHLY || 'price_starter_149', // $149/month
  growth_monthly: process.env.STRIPE_GROWTH_MONTHLY || 'price_growth_349', // $349/month
  scale_monthly: process.env.STRIPE_SCALE_MONTHLY || 'price_scale_599', // $599/month
  enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY || 'price_enterprise_999', // $999/month
  
  // Annual prices (20% discount)
  starter_annual: process.env.STRIPE_STARTER_ANNUAL || 'price_starter_1430', // $1,430/year (save $358)
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL || 'price_growth_3350', // $3,350/year (save $838)
  scale_annual: process.env.STRIPE_SCALE_ANNUAL || 'price_scale_5750', // $5,750/year (save $1,438)
  enterprise_annual: process.env.STRIPE_ENTERPRISE_ANNUAL || 'price_enterprise_9590', // $9,590/year (save $2,398)
};

// Special offer codes
const PROMO_CODES = {
  ninety_escape: 'NINETY50', // 50% off for 6 months for Ninety.io switchers
  early_bird: 'EARLY20', // 20% off first year for early converters
  partner: 'PARTNER30', // 30% off for partner referrals
};

// Plan limits and features
const PLAN_FEATURES = {
  starter: {
    name: 'Starter',
    price_monthly: 149,
    price_annual: 1430,
    max_users: 25,
    features: [
      'Up to 25 users',
      'All core features',
      'Custom terminology',
      'Email support',
      'Monthly training webinars',
      'Data export'
    ],
    limits: {
      users: 25,
      priorities: 50,
      scorecard_metrics: 30,
      documents: 100,
      document_size_mb: 10,
      departments: 5
    }
  },
  growth: {
    name: 'Growth',
    price_monthly: 349,
    price_annual: 3350,
    max_users: 75,
    features: [
      'Up to 75 users',
      'Everything in Starter',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Quarterly business reviews'
    ],
    limits: {
      users: 75,
      priorities: 200,
      scorecard_metrics: 100,
      documents: 500,
      document_size_mb: 25,
      departments: 15
    }
  },
  scale: {
    name: 'Scale',
    price_monthly: 599,
    price_annual: 5750,
    max_users: 200,
    features: [
      'Up to 200 users',
      'Everything in Growth',
      'Dedicated success manager',
      'Custom onboarding',
      'SLA guarantee',
      'Advanced security features',
      'Multi-framework support'
    ],
    limits: {
      users: 200,
      priorities: 500,
      scorecard_metrics: 250,
      documents: 2000,
      document_size_mb: 50,
      departments: 50
    }
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 999,
    price_annual: 9590,
    max_users: null, // unlimited
    features: [
      'Unlimited users',
      'Everything in Scale',
      'White-label options',
      'Custom domain',
      '24/7 phone support',
      'Dedicated infrastructure',
      'Custom contracts',
      'Onsite training available'
    ],
    limits: {
      users: null, // unlimited
      priorities: null,
      scorecard_metrics: null,
      documents: null,
      document_size_mb: 100,
      departments: null
    }
  }
};

// Calculate savings vs Ninety.io
const calculateNinetySavings = (plan, teamSize = 50) => {
  const ninetyMonthly = teamSize * 16; // $16/user/month
  const planMonthly = PLAN_FEATURES[plan].price_monthly;
  
  // Handle unlimited users for enterprise
  if (plan === 'enterprise') {
    return {
      monthly_savings: Math.max(0, ninetyMonthly - planMonthly),
      annual_savings: Math.max(0, (ninetyMonthly * 12) - PLAN_FEATURES[plan].price_annual),
      percentage_saved: Math.round(((ninetyMonthly - planMonthly) / ninetyMonthly) * 100)
    };
  }
  
  // Check if team size fits in plan
  const maxUsers = PLAN_FEATURES[plan].max_users;
  if (teamSize > maxUsers) {
    return {
      monthly_savings: 0,
      annual_savings: 0,
      percentage_saved: 0,
      upgrade_needed: true
    };
  }
  
  return {
    monthly_savings: ninetyMonthly - planMonthly,
    annual_savings: (ninetyMonthly * 12) - PLAN_FEATURES[plan].price_annual,
    percentage_saved: Math.round(((ninetyMonthly - planMonthly) / ninetyMonthly) * 100)
  };
};

// Get recommended plan based on team size
const getRecommendedPlan = (teamSize) => {
  if (teamSize <= 25) return 'starter';
  if (teamSize <= 75) return 'growth';
  if (teamSize <= 200) return 'scale';
  return 'enterprise';
};

// Webhook secret
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET';

export {
  stripe,
  STRIPE_PRICES,
  PROMO_CODES,
  PLAN_FEATURES,
  calculateNinetySavings,
  getRecommendedPlan,
  STRIPE_WEBHOOK_SECRET
};