import { query } from '../config/database.js';
import { stripe } from '../config/stripe-flat-rate.js';

/**
 * Debug endpoint to check subscription status in both DB and Stripe
 */
export const debugSubscription = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const userEmail = req.user.email;
    
    console.log('🔍 DEBUG: Checking subscription for org:', organizationId);
    console.log('🔍 DEBUG: User email:', userEmail);
    
    // Check DB
    const dbResult = await query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );
    
    const dbSubscription = dbResult.rows[0];
    console.log('📊 DB Subscription:', dbSubscription ? {
      id: dbSubscription.id,
      status: dbSubscription.status,
      plan_id: dbSubscription.plan_id,
      stripe_customer_id: dbSubscription.stripe_customer_id,
      stripe_subscription_id: dbSubscription.stripe_subscription_id
    } : 'None found');
    
    // Check organization for stripe_customer_id
    const orgResult = await query(
      'SELECT stripe_customer_id FROM organizations WHERE id = $1',
      [organizationId]
    );
    
    const orgCustomerId = orgResult.rows[0]?.stripe_customer_id;
    console.log('🏢 Organization stripe_customer_id:', orgCustomerId || 'None');
    
    // Search Stripe by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10
    });
    
    console.log(`🔎 Found ${customers.data.length} Stripe customer(s) with email ${userEmail}`);
    
    const stripeInfo = [];
    
    for (const customer of customers.data) {
      console.log(`📧 Checking Stripe customer ${customer.id}...`);
      
      // Get all subscriptions for this customer
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      for (const sub of subs.data) {
        const info = {
          customer_id: customer.id,
          customer_email: customer.email,
          subscription_id: sub.id,
          status: sub.status,
          price_id: sub.items.data[0]?.price.id,
          created: new Date(sub.created * 1000).toISOString(),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        };
        
        stripeInfo.push(info);
        console.log('💳 Stripe subscription found:', info);
      }
    }
    
    // Return debug info
    res.json({
      organization_id: organizationId,
      user_email: userEmail,
      database: {
        subscription: dbSubscription || null,
        org_customer_id: orgCustomerId || null
      },
      stripe: {
        customers_found: customers.data.length,
        subscriptions: stripeInfo
      },
      recommendations: generateRecommendations(dbSubscription, stripeInfo, orgCustomerId)
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message 
    });
  }
};

function generateRecommendations(dbSub, stripeInfo, orgCustomerId) {
  const recommendations = [];
  
  if (!dbSub && stripeInfo.length > 0) {
    recommendations.push('⚠️ Subscription exists in Stripe but not in database. Run sync endpoint to fix.');
  }
  
  if (dbSub && stripeInfo.length === 0) {
    recommendations.push('⚠️ Subscription exists in database but not in Stripe. May need cleanup.');
  }
  
  if (dbSub && stripeInfo.length > 0) {
    const activeStripe = stripeInfo.find(s => s.status === 'active');
    if (activeStripe && dbSub.stripe_subscription_id !== activeStripe.subscription_id) {
      recommendations.push('⚠️ Database subscription ID does not match Stripe. Run sync to update.');
    }
  }
  
  if (!orgCustomerId && stripeInfo.length > 0) {
    recommendations.push('⚠️ Organization missing stripe_customer_id. Will be updated on sync.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Everything looks good!');
  }
  
  return recommendations;
}

export default debugSubscription;