const Subscription = require('../models/Subscription');

// Middleware to check if organization has active subscription
const requireActiveSubscription = async (req, res, next) => {
  try {
    const organizationId = req.user.organization;
    const subscription = await Subscription.findOne({ organization: organizationId });

    if (!subscription) {
      return res.status(403).json({ 
        error: 'No subscription found',
        requiresSubscription: true 
      });
    }

    // Check if trial has expired and subscription is not active
    if (subscription.isTrialExpired && subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'Trial expired. Please add payment method to continue.',
        requiresSubscription: true,
        trialExpired: true
      });
    }

    // Check if subscription is canceled or past due
    if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
      return res.status(403).json({ 
        error: 'Subscription is not active',
        requiresSubscription: true,
        subscriptionStatus: subscription.status
      });
    }

    // Add subscription info to request
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
};

module.exports = requireActiveSubscription;