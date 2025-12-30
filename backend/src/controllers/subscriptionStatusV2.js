import { query } from '../config/database.js';

/**
 * Get subscription status for the current organization
 * Used by billing page to determine what to show
 */
export const getSubscriptionStatus = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    console.log('📊 Getting subscription status for org:', organizationId);
    
    // Get subscription from database
    const result = await query(
      `SELECT 
        s.*,
        o.trial_started_at,
        o.trial_ends_at,
        o.has_custom_pricing,
        o.custom_pricing_amount,
        CASE 
          WHEN s.status = 'trialing' AND s.trial_end_date IS NOT NULL 
          THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.trial_end_date - NOW())) / 86400))
          ELSE 0 
        END as trial_days_remaining,
        CASE
          WHEN s.status = 'trialing' AND s.trial_end_date < NOW() THEN true
          ELSE false
        END as is_trial_expired
      FROM subscriptions s
      LEFT JOIN organizations o ON o.id = s.organization_id
      WHERE s.organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      console.log('📊 No subscription found for org:', organizationId);
      return res.json({ 
        hasSubscription: false,
        status: 'none',
        message: 'No subscription found' 
      });
    }

    const subscription = result.rows[0];
    console.log('📊 Subscription found:', {
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      stripe_subscription_id: subscription.stripe_subscription_id
    });
    
    // Return subscription data
    res.json({
      hasSubscription: true,
      id: subscription.id,
      status: subscription.status,
      plan_id: subscription.plan_id,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      trial_days_remaining: subscription.trial_days_remaining,
      is_trial_expired: subscription.is_trial_expired,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      hasCustomPricing: subscription.has_custom_pricing || false,
      customPricingAmount: subscription.custom_pricing_amount ? parseFloat(subscription.custom_pricing_amount) : null
    });
    
  } catch (error) {
    console.error('❌ Error fetching subscription status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscription status',
      message: error.message 
    });
  }
};

export default getSubscriptionStatus;