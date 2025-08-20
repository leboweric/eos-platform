import { query, getClient, commitTransaction, rollbackTransaction } from '../config/database.js';
import { 
  stripe, 
  STRIPE_PRICES, 
  PLAN_FEATURES, 
  getRecommendedPlan,
  calculateNinetySavings,
  PROMO_CODES
} from '../config/stripe-flat-rate.js';
import { sendEmail } from '../services/emailService.js';

// Convert trial to paid subscription
const convertTrialToPaid = async (req, res) => {
  const client = await getClient();
  
  try {
    const { 
      paymentMethodId, 
      planId, // starter, growth, scale, enterprise
      billingInterval, // monthly or annual
      promoCode // optional promo code
    } = req.body;
    
    const organizationId = req.user.organization_id;

    // Start transaction
    await client.query('BEGIN');

    // Get organization and subscription details
    const orgResult = await client.query(
      `SELECT 
        o.*, 
        s.id as subscription_id,
        s.stripe_customer_id,
        s.trial_end_date,
        s.status,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      WHERE o.id = $1`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found');
    }

    const org = orgResult.rows[0];
    const userCount = parseInt(org.user_count);

    // Validate plan selection based on user count
    const planFeatures = PLAN_FEATURES[planId];
    if (!planFeatures) {
      throw new Error('Invalid plan selected');
    }

    if (planFeatures.max_users && userCount > planFeatures.max_users) {
      return res.status(400).json({
        error: 'Team too large for selected plan',
        message: `The ${planFeatures.name} plan supports up to ${planFeatures.max_users} users. You have ${userCount} users.`,
        recommendedPlan: getRecommendedPlan(userCount)
      });
    }

    // Get the correct Stripe price ID
    const priceKey = `${planId}_${billingInterval}`;
    const stripePriceId = STRIPE_PRICES[priceKey];
    
    if (!stripePriceId) {
      throw new Error('Invalid pricing configuration');
    }

    // Create or retrieve Stripe customer
    let customerId = org.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: org.name,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        },
        metadata: {
          organizationId: organizationId.toString(),
          planId,
          userCount: userCount.toString()
        }
      });
      customerId = customer.id;
    } else {
      // Update existing customer's payment method
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
    }

    // Apply promo code if provided
    let discountId = null;
    if (promoCode) {
      // Special handling for Ninety.io switchers
      if (promoCode === PROMO_CODES.ninety_escape) {
        // Create 50% off for 6 months coupon
        const coupon = await stripe.coupons.create({
          percent_off: 50,
          duration: 'repeating',
          duration_in_months: 6,
          metadata: {
            type: 'ninety_switcher',
            organizationId: organizationId.toString()
          }
        });
        discountId = coupon.id;
      } else if (promoCode === PROMO_CODES.early_bird) {
        // 20% off first year
        const coupon = await stripe.coupons.create({
          percent_off: 20,
          duration: 'repeating',
          duration_in_months: 12,
          metadata: {
            type: 'early_bird',
            organizationId: organizationId.toString()
          }
        });
        discountId = coupon.id;
      }
    }

    // Create Stripe subscription
    const subscriptionParams = {
      customer: customerId,
      items: [{ price: stripePriceId }],
      trial_end: 'now', // End trial immediately
      metadata: {
        organizationId: organizationId.toString(),
        planId,
        userCount: userCount.toString()
      }
    };

    if (discountId) {
      subscriptionParams.coupon = discountId;
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Update database subscription
    await client.query(
      `UPDATE subscriptions SET
        stripe_customer_id = $1,
        stripe_subscription_id = $2,
        stripe_payment_method_id = $3,
        status = $4,
        plan_id = $5,
        trial_type = 'paid',
        trial_converted_at = NOW(),
        current_period_start = $6,
        current_period_end = $7,
        price_per_user = $8,
        user_count = $9
      WHERE organization_id = $10`,
      [
        customerId,
        stripeSubscription.id,
        paymentMethodId,
        stripeSubscription.status,
        planId,
        stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000) : new Date(),
        stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        planFeatures.price_monthly,
        userCount,
        organizationId
      ]
    );

    // Update organization
    await client.query(
      `UPDATE organizations SET
        subscription_tier = $1,
        has_active_subscription = true
      WHERE id = $2`,
      [planId, organizationId]
    );

    await commitTransaction(client);

    // Calculate savings
    const savings = calculateNinetySavings(planId, userCount);

    // Send confirmation email
    await sendEmail(
      req.user.email,
      'subscriptionConfirmation',
      {
        firstName: req.user.firstName,
        planName: planFeatures.name,
        price: billingInterval === 'annual' 
          ? `$${planFeatures.price_annual}/year`
          : `$${planFeatures.price_monthly}/month`,
        features: planFeatures.features,
        savings: savings.monthly_savings,
        nextBillingDate: new Date(stripeSubscription.current_period_end * 1000)
      }
    );

    res.json({
      success: true,
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        planId,
        planName: planFeatures.name,
        billingInterval,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        price: billingInterval === 'annual' 
          ? planFeatures.price_annual
          : planFeatures.price_monthly,
        savings: savings,
        features: planFeatures.features
      }
    });

  } catch (error) {
    await rollbackTransaction(client);
    console.error('Trial conversion error:', error);
    res.status(500).json({ 
      error: 'Failed to convert trial',
      message: error.message 
    });
  } finally {
    client.release();
  }
};

// Get available plans with pricing
const getAvailablePlans = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    // Get current user count
    const result = await query(
      'SELECT COUNT(*) as user_count FROM users WHERE organization_id = $1',
      [organizationId]
    );
    
    const userCount = parseInt(result.rows[0].user_count);
    const recommendedPlan = getRecommendedPlan(userCount);
    
    // Build plans with savings calculations
    const plans = Object.keys(PLAN_FEATURES).map(planId => {
      const plan = PLAN_FEATURES[planId];
      const savings = calculateNinetySavings(planId, userCount);
      
      return {
        id: planId,
        ...plan,
        recommended: planId === recommendedPlan,
        canSelect: !plan.max_users || userCount <= plan.max_users,
        savings,
        stripe_price_ids: {
          monthly: STRIPE_PRICES[`${planId}_monthly`],
          annual: STRIPE_PRICES[`${planId}_annual`]
        }
      };
    });

    res.json({
      plans,
      currentUserCount: userCount,
      recommendedPlan,
      ninety_comparison: {
        monthly_cost: userCount * 16,
        annual_cost: userCount * 16 * 12
      }
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get available plans' });
  }
};

// Update subscription (change plan)
const updateSubscription = async (req, res) => {
  try {
    const { planId, billingInterval } = req.body;
    const organizationId = req.user.organization_id;

    // Get current subscription
    const result = await query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscription = result.rows[0];
    
    if (!subscription.stripe_subscription_id) {
      return res.status(400).json({ 
        error: 'No active subscription',
        message: 'Please complete your trial conversion first'
      });
    }

    // Get new price ID
    const priceKey = `${planId}_${billingInterval}`;
    const newPriceId = STRIPE_PRICES[priceKey];

    // Update Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPriceId
        }],
        proration_behavior: 'create_prorations'
      }
    );

    // Update database
    await query(
      `UPDATE subscriptions SET
        plan_id = $1,
        price_per_user = $2,
        updated_at = NOW()
      WHERE organization_id = $3`,
      [planId, PLAN_FEATURES[planId].price_monthly, organizationId]
    );

    await query(
      'UPDATE organizations SET subscription_tier = $1 WHERE id = $2',
      [planId, organizationId]
    );

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      newPlan: planId,
      nextBillingDate: new Date(updatedSubscription.current_period_end * 1000)
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

// Apply promo code
const applyPromoCode = async (req, res) => {
  try {
    const { code } = req.body;
    
    // Validate promo code
    let discount = null;
    let message = '';
    
    if (code === PROMO_CODES.ninety_escape) {
      discount = {
        type: 'percentage',
        amount: 50,
        duration: '6 months',
        description: 'Ninety.io Escape Plan: 50% off for 6 months'
      };
      message = 'Welcome from Ninety.io! You\'ll save 50% for the next 6 months.';
    } else if (code === PROMO_CODES.early_bird) {
      discount = {
        type: 'percentage',
        amount: 20,
        duration: '12 months',
        description: 'Early Bird: 20% off your first year'
      };
      message = 'Early bird discount applied! You\'ll save 20% for your first year.';
    } else if (code === PROMO_CODES.partner) {
      discount = {
        type: 'percentage',
        amount: 30,
        duration: 'forever',
        description: 'Partner discount: 30% off forever'
      };
      message = 'Partner discount applied! You\'ll save 30% on all future bills.';
    } else {
      return res.status(400).json({ 
        error: 'Invalid promo code',
        message: 'The promo code you entered is not valid.'
      });
    }

    res.json({
      success: true,
      discount,
      message
    });

  } catch (error) {
    console.error('Promo code error:', error);
    res.status(500).json({ error: 'Failed to apply promo code' });
  }
};

export {
  convertTrialToPaid,
  getAvailablePlans,
  updateSubscription,
  applyPromoCode
};