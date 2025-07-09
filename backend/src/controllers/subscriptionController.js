import { query } from '../config/database.js';
import { stripe, STRIPE_PRICES } from '../config/stripe.js';

// Start a free trial with credit card
const startTrial = async (req, res) => {
  try {
    const { paymentMethodId, billingEmail } = req.body;
    const organizationId = req.user.organization_id;

    // Check if organization already has a subscription
    const existingSubscription = await query(
      'SELECT id FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );
    
    if (existingSubscription.rows.length > 0) {
      return res.status(400).json({ error: 'Organization already has a subscription' });
    }

    // Get organization details and user count
    const orgResult = await query(
      `SELECT o.*, COUNT(u.id) as user_count 
       FROM organizations o 
       LEFT JOIN users u ON u.organization_id = o.id 
       WHERE o.id = $1 
       GROUP BY o.id`,
      [organizationId]
    );
    
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgResult.rows[0];
    const userCount = parseInt(organization.user_count) || 1;

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: billingEmail,
      name: organization.name,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId
      },
      metadata: {
        organizationId: organizationId.toString()
      }
    });

    // Create subscription record (trial only, no Stripe subscription yet)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    const subscriptionResult = await query(
      `INSERT INTO subscriptions (
        organization_id, stripe_customer_id, stripe_payment_method_id,
        billing_email, status, plan_id, user_count, price_per_user,
        trial_start_date, trial_end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        organizationId, customer.id, paymentMethodId,
        billingEmail, 'trialing', 'pro', userCount, 5,
        new Date(), trialEndDate
      ]
    );

    const subscription = subscriptionResult.rows[0];

    // Update organization with subscription status
    await query(
      'UPDATE organizations SET has_active_subscription = true WHERE id = $1',
      [organizationId]
    );

    res.json({
      success: true,
      subscription: {
        status: subscription.status,
        trialEndDate: subscription.trial_end_date,
        trialDaysRemaining: Math.ceil((trialEndDate - new Date()) / (1000 * 60 * 60 * 24)),
        userCount: subscription.user_count,
        monthlyTotal: subscription.user_count * subscription.price_per_user
      }
    });
  } catch (error) {
    console.error('Start trial error:', error);
    res.status(500).json({ error: 'Failed to start trial' });
  }
};

// Get subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    const result = await query(
      `SELECT *, 
       CASE 
         WHEN status = 'trialing' THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (trial_end_date - NOW())) / 86400))
         ELSE 0 
       END as trial_days_remaining,
       CASE
         WHEN status = 'trialing' AND trial_end_date < NOW() THEN true
         ELSE false
       END as is_trial_expired,
       user_count * price_per_user as monthly_total
       FROM subscriptions 
       WHERE organization_id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.json({ hasSubscription: false });
    }

    const subscription = result.rows[0];

    res.json({
      hasSubscription: true,
      status: subscription.status,
      planId: subscription.plan_id,
      trialEndDate: subscription.trial_end_date,
      trialDaysRemaining: parseInt(subscription.trial_days_remaining),
      isTrialExpired: subscription.is_trial_expired,
      currentPeriodEnd: subscription.current_period_end,
      userCount: subscription.user_count,
      pricePerUser: subscription.price_per_user,
      monthlyTotal: parseFloat(subscription.monthly_total)
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const organizationId = req.user.organization_id;
    
    const result = await query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscription = result.rows[0];

    // If there's an active Stripe subscription, cancel it
    if (subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: {
          cancelReason: reason
        }
      });
    }

    // Update subscription record
    await query(
      `UPDATE subscriptions 
       SET status = 'canceled', canceled_at = NOW(), cancel_reason = $1 
       WHERE organization_id = $2`,
      [reason, organizationId]
    );

    // Update organization
    await query(
      'UPDATE organizations SET has_active_subscription = false WHERE id = $1',
      [organizationId]
    );

    res.json({ success: true, message: 'Subscription canceled' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

// Update payment method
const updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const organizationId = req.user.organization_id;
    
    const result = await query(
      'SELECT * FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const subscription = result.rows[0];

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripe_customer_id
    });

    // Set as default payment method
    await stripe.customers.update(subscription.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Update subscription record
    await query(
      'UPDATE subscriptions SET stripe_payment_method_id = $1 WHERE organization_id = $2',
      [paymentMethodId, organizationId]
    );

    res.json({ success: true, message: 'Payment method updated' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
};

// Get billing history
const getBillingHistory = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    const result = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      return res.json({ invoices: [] });
    }

    const subscription = result.rows[0];

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 20
    });

    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      date: new Date(invoice.created * 1000),
      amount: invoice.amount_paid / 100,
      status: invoice.status,
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    }));

    res.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({ error: 'Failed to get billing history' });
  }
};

// Process trial endings (called by cron job)
const processTrialEndings = async () => {
  try {
    // Find all trialing subscriptions that have expired
    const expiredTrials = await query(
      `SELECT s.*, o.name as organization_name, 
       COUNT(u.id) as current_user_count
       FROM subscriptions s
       JOIN organizations o ON s.organization_id = o.id
       LEFT JOIN users u ON u.organization_id = o.id
       WHERE s.status = 'trialing' AND s.trial_end_date <= NOW()
       GROUP BY s.id, o.id`
    );

    for (const subscription of expiredTrials.rows) {
      try {
        const userCount = parseInt(subscription.current_user_count) || 1;

        // Update user count before creating subscription
        await query(
          'UPDATE subscriptions SET user_count = $1 WHERE id = $2',
          [userCount, subscription.id]
        );

        // Create Stripe subscription with quantity for per-user pricing
        const stripeSubscription = await stripe.subscriptions.create({
          customer: subscription.stripe_customer_id,
          items: [{ 
            price: STRIPE_PRICES[subscription.plan_id],
            quantity: userCount
          }],
          metadata: {
            organizationId: subscription.organization_id.toString()
          }
        });

        // Update subscription record
        await query(
          `UPDATE subscriptions 
           SET stripe_subscription_id = $1, 
               stripe_subscription_item_id = $2,
               status = 'active',
               current_period_start = $3,
               current_period_end = $4
           WHERE id = $5`,
          [
            stripeSubscription.id,
            stripeSubscription.items.data[0].id,
            new Date(stripeSubscription.current_period_start * 1000),
            new Date(stripeSubscription.current_period_end * 1000),
            subscription.id
          ]
        );

        console.log(`Converted trial to paid subscription for organization ${subscription.organization_id} with ${userCount} users`);
      } catch (error) {
        console.error(`Failed to convert trial for organization ${subscription.organization_id}:`, error);
        
        // Update subscription status to incomplete
        await query(
          'UPDATE subscriptions SET status = $1 WHERE id = $2',
          ['incomplete', subscription.id]
        );

        // Update organization
        await query(
          'UPDATE organizations SET has_active_subscription = false WHERE id = $1',
          [subscription.organization_id]
        );
      }
    }
  } catch (error) {
    console.error('Process trial endings error:', error);
  }
};

// Send trial reminders (called by cron job)
const sendTrialReminders = async () => {
  try {
    // Find all trialing subscriptions
    const trialSubscriptions = await query(
      `SELECT s.*, o.name as organization_name,
       CEIL(EXTRACT(EPOCH FROM (s.trial_end_date - NOW())) / 86400) as days_remaining
       FROM subscriptions s
       JOIN organizations o ON s.organization_id = o.id
       WHERE s.status = 'trialing'`
    );

    for (const subscription of trialSubscriptions.rows) {
      const daysRemaining = parseInt(subscription.days_remaining);
      let reminderType = null;
      
      // Determine which reminder to send
      if (daysRemaining <= 1 && subscription.last_reminder_sent !== '1_day') {
        reminderType = '1_day';
      } else if (daysRemaining <= 3 && daysRemaining > 1 && subscription.last_reminder_sent !== '3_days') {
        reminderType = '3_days';
      } else if (daysRemaining <= 7 && daysRemaining > 3 && !subscription.last_reminder_sent) {
        reminderType = '7_days';
      }
      
      if (reminderType) {
        // Get organization admin
        const adminResult = await query(
          `SELECT email, first_name, last_name 
           FROM users 
           WHERE organization_id = $1 AND role = 'admin' 
           LIMIT 1`,
          [subscription.organization_id]
        );

        if (adminResult.rows.length > 0) {
          const admin = adminResult.rows[0];
          
          // Here you would send an email using your email service
          console.log(`Sending ${reminderType} reminder to ${admin.email} for organization ${subscription.organization_name}`);
          
          // Update last reminder sent
          await query(
            'UPDATE subscriptions SET last_reminder_sent = $1 WHERE id = $2',
            [reminderType, subscription.id]
          );
        }
      }
    }
  } catch (error) {
    console.error('Send trial reminders error:', error);
  }
};

// Update subscription user count (called when users join/leave organization)
const updateSubscriptionUserCount = async (organizationId) => {
  try {
    const subscriptionResult = await query(
      `SELECT * FROM subscriptions 
       WHERE organization_id = $1 AND status IN ('active', 'trialing')`,
      [organizationId]
    );

    if (subscriptionResult.rows.length === 0) {
      return;
    }

    const subscription = subscriptionResult.rows[0];

    // Get current user count
    const userCountResult = await query(
      'SELECT COUNT(*) as count FROM users WHERE organization_id = $1',
      [organizationId]
    );
    
    const newUserCount = parseInt(userCountResult.rows[0].count) || 1;

    // Update local record
    await query(
      'UPDATE subscriptions SET user_count = $1 WHERE id = $2',
      [newUserCount, subscription.id]
    );

    // If there's an active Stripe subscription, update the quantity
    if (subscription.stripe_subscription_id && subscription.stripe_subscription_item_id && subscription.status === 'active') {
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          items: [{
            id: subscription.stripe_subscription_item_id,
            quantity: newUserCount
          }],
          proration_behavior: 'create_prorations'
        });
        
        console.log(`Updated subscription quantity for organization ${organizationId} to ${newUserCount} users`);
      } catch (error) {
        console.error(`Failed to update Stripe subscription quantity:`, error);
      }
    }
  } catch (error) {
    console.error('Update subscription user count error:', error);
  }
};

export {
  startTrial,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory,
  processTrialEndings,
  sendTrialReminders,
  updateSubscriptionUserCount
};