import { query, getClient, commitTransaction, rollbackTransaction } from '../config/database.js';
import { stripe, PLAN_FEATURES } from '../config/stripe-flat-rate.js';

/**
 * Sync subscription from Stripe to database
 * This handles cases where webhook failed or subscription exists in Stripe but not in DB
 */
export const syncSubscriptionFromStripe = async (req, res) => {
  const client = await getClient();
  
  try {
    const organizationId = req.user.organization_id;
    const userEmail = req.user.email;
    
    console.log('🔄 Starting subscription sync for org:', organizationId);
    console.log('🔄 User email:', userEmail);
    
    // Start transaction
    await client.query('BEGIN');
    
    // First, try to find existing subscription record
    const subResult = await client.query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );
    
    let subscription = subResult.rows[0];
    let customerId = subscription?.stripe_customer_id;
    
    console.log('🔍 Existing subscription in DB:', subscription ? 'Found' : 'Not found');
    console.log('🔍 Customer ID from DB:', customerId || 'None');
    
    // If no customer ID, search Stripe by email
    if (!customerId) {
      console.log('🔎 No customer ID in DB, searching Stripe for email:', userEmail);
      
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 10
      });
      
      console.log(`🔎 Found ${customers.data.length} customer(s) in Stripe with email ${userEmail}`);
      
      if (customers.data.length > 0) {
        // Find customer with active subscription
        for (const customer of customers.data) {
          console.log(`🔎 Checking customer ${customer.id}...`);
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'active',
            limit: 1
          });
          
          if (subs.data.length > 0) {
            customerId = customer.id;
            console.log('✅ Found customer with active subscription in Stripe:', customerId);
            console.log('✅ Subscription ID:', subs.data[0].id);
            break;
          }
        }
      }
    }
    
    if (!customerId) {
      await rollbackTransaction(client);
      return res.status(404).json({ 
        error: 'No Stripe customer found',
        message: 'No active subscription found in Stripe for this account'
      });
    }
    
    // Get subscription from Stripe
    const stripeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });
    
    if (stripeSubscriptions.data.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({ 
        error: 'No active subscription',
        message: 'No active subscription found in Stripe'
      });
    }
    
    const stripeSub = stripeSubscriptions.data[0];
    console.log('📋 Found Stripe subscription:', stripeSub.id);
    console.log('📋 Subscription status:', stripeSub.status);
    console.log('📋 Price ID:', stripeSub.items.data[0]?.price.id);
    
    // Determine plan from price ID
    let planId = 'starter'; // default
    const priceId = stripeSub.items.data[0]?.price.id;
    
    // Map price ID to plan
    if (priceId) {
      if (priceId === process.env.STRIPE_STARTER_MONTHLY || priceId === process.env.STRIPE_STARTER_ANNUAL) {
        planId = 'starter';
      } else if (priceId === process.env.STRIPE_GROWTH_MONTHLY || priceId === process.env.STRIPE_GROWTH_ANNUAL) {
        planId = 'growth';
      } else if (priceId === process.env.STRIPE_SCALE_MONTHLY || priceId === process.env.STRIPE_SCALE_ANNUAL) {
        planId = 'scale';
      } else if (priceId === process.env.STRIPE_ENTERPRISE_MONTHLY || priceId === process.env.STRIPE_ENTERPRISE_ANNUAL) {
        planId = 'enterprise';
      }
    }
    
    const planFeatures = PLAN_FEATURES[planId];
    
    // Get current user count
    const userCountResult = await client.query(
      'SELECT COUNT(*) as count FROM users WHERE organization_id = $1',
      [organizationId]
    );
    const userCount = parseInt(userCountResult.rows[0].count);
    
    if (subscription) {
      // Update existing subscription
      await client.query(
        `UPDATE subscriptions SET
          stripe_customer_id = $1,
          stripe_subscription_id = $2,
          status = $3,
          plan_id = $4,
          trial_type = 'paid',
          trial_converted_at = COALESCE(trial_converted_at, NOW()),
          current_period_start = $5,
          current_period_end = $6,
          user_count = $7,
          price_per_user = $8,
          billing_interval = $9
        WHERE organization_id = $10`,
        [
          customerId,
          stripeSub.id,
          stripeSub.status,
          planId,
          stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : new Date(),
          stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : new Date(),
          userCount,
          planFeatures.price_monthly,
          stripeSub.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
          organizationId
        ]
      );
    } else {
      // Create new subscription record
      await client.query(
        `INSERT INTO subscriptions (
          organization_id,
          stripe_customer_id,
          stripe_subscription_id,
          status,
          plan_id,
          trial_type,
          trial_converted_at,
          current_period_start,
          current_period_end,
          user_count,
          price_per_user,
          billing_interval,
          billing_email,
          trial_start_date,
          trial_end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          organizationId,
          customerId,
          stripeSub.id,
          stripeSub.status,
          planId,
          'paid',
          new Date(),
          stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000) : new Date(),
          stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : new Date(),
          userCount,
          planFeatures.price_monthly,
          stripeSub.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly',
          userEmail,
          new Date(),
          new Date()
        ]
      );
    }
    
    // Update organization
    await client.query(
      `UPDATE organizations SET
        subscription_tier = $1,
        has_active_subscription = true
      WHERE id = $2`,
      [planId, organizationId]
    );
    
    await commitTransaction(client);
    
    console.log('✅ Successfully synced subscription for org:', organizationId);
    
    res.json({
      success: true,
      message: 'Subscription synced successfully',
      subscription: {
        id: stripeSub.id,
        status: stripeSub.status,
        planId,
        customerId,
        currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : new Date()
      }
    });
    
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Subscription sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync subscription',
      message: error.message 
    });
  }
  // Note: client.release() is called by commitTransaction/rollbackTransaction
};