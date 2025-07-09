const Subscription = require('../models/Subscription');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { stripe, STRIPE_PRICES } = require('../config/stripe');

// Start a free trial with credit card
const startTrial = async (req, res) => {
  try {
    const { paymentMethodId, billingEmail } = req.body;
    const organizationId = req.user.organization;

    // Check if organization already has a subscription
    const existingSubscription = await Subscription.findOne({ organization: organizationId });
    if (existingSubscription) {
      return res.status(400).json({ error: 'Organization already has a subscription' });
    }

    // Get organization details
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

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
    const subscription = new Subscription({
      organization: organizationId,
      stripeCustomerId: customer.id,
      stripePaymentMethodId: paymentMethodId,
      billingEmail,
      status: 'trialing',
      planId: 'pro'
    });

    await subscription.save();

    // Update organization with subscription status
    organization.hasActiveSubscription = true;
    await organization.save();

    res.json({
      success: true,
      subscription: {
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        trialDaysRemaining: subscription.trialDaysRemaining
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
    const organizationId = req.user.organization;
    const subscription = await Subscription.findOne({ organization: organizationId });

    if (!subscription) {
      return res.json({ hasSubscription: false });
    }

    res.json({
      hasSubscription: true,
      status: subscription.status,
      planId: subscription.planId,
      trialEndDate: subscription.trialEndDate,
      trialDaysRemaining: subscription.trialDaysRemaining,
      isTrialExpired: subscription.isTrialExpired,
      currentPeriodEnd: subscription.currentPeriodEnd
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
    const organizationId = req.user.organization;
    const subscription = await Subscription.findOne({ organization: organizationId });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // If there's an active Stripe subscription, cancel it
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancelReason: reason
        }
      });
    }

    // Update subscription record
    subscription.canceledAt = new Date();
    subscription.cancelReason = reason;
    subscription.status = 'canceled';
    await subscription.save();

    // Update organization
    const organization = await Organization.findById(organizationId);
    organization.hasActiveSubscription = false;
    await organization.save();

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
    const organizationId = req.user.organization;
    const subscription = await Subscription.findOne({ organization: organizationId });

    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: subscription.stripeCustomerId
    });

    // Set as default payment method
    await stripe.customers.update(subscription.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Update subscription record
    subscription.stripePaymentMethodId = paymentMethodId;
    await subscription.save();

    res.json({ success: true, message: 'Payment method updated' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
};

// Get billing history
const getBillingHistory = async (req, res) => {
  try {
    const organizationId = req.user.organization;
    const subscription = await Subscription.findOne({ organization: organizationId });

    if (!subscription) {
      return res.json({ invoices: [] });
    }

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
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
    const expiredTrials = await Subscription.find({
      status: 'trialing',
      trialEndDate: { $lte: new Date() }
    });

    for (const subscription of expiredTrials) {
      try {
        // Create Stripe subscription
        const stripeSubscription = await stripe.subscriptions.create({
          customer: subscription.stripeCustomerId,
          items: [{ price: STRIPE_PRICES[subscription.planId] }],
          metadata: {
            organizationId: subscription.organization.toString()
          }
        });

        // Update subscription record
        subscription.stripeSubscriptionId = stripeSubscription.id;
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
        subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
        await subscription.save();

        console.log(`Converted trial to paid subscription for organization ${subscription.organization}`);
      } catch (error) {
        console.error(`Failed to convert trial for organization ${subscription.organization}:`, error);
        
        // Update subscription status to incomplete
        subscription.status = 'incomplete';
        await subscription.save();

        // Update organization
        const organization = await Organization.findById(subscription.organization);
        if (organization) {
          organization.hasActiveSubscription = false;
          await organization.save();
        }
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
    const trialSubscriptions = await Subscription.find({
      status: 'trialing'
    }).populate('organization');

    for (const subscription of trialSubscriptions) {
      const reminderType = subscription.getRequiredReminder();
      
      if (reminderType) {
        // Get organization admin
        const admin = await User.findOne({
          organization: subscription.organization._id,
          role: 'admin'
        });

        if (admin) {
          // Here you would send an email using your email service
          // For now, we'll just log it
          console.log(`Sending ${reminderType} reminder to ${admin.email} for organization ${subscription.organization.name}`);
          
          // Update last reminder sent
          subscription.lastReminderSent = reminderType;
          await subscription.save();

          // In production, you would call your email service here
          // await sendEmail({
          //   to: admin.email,
          //   subject: getEmailSubject(reminderType),
          //   template: 'trial-reminder',
          //   data: {
          //     organizationName: subscription.organization.name,
          //     daysRemaining: subscription.trialDaysRemaining,
          //     trialEndDate: subscription.trialEndDate
          //   }
          // });
        }
      }
    }
  } catch (error) {
    console.error('Send trial reminders error:', error);
  }
};

module.exports = {
  startTrial,
  getSubscriptionStatus,
  cancelSubscription,
  updatePaymentMethod,
  getBillingHistory,
  processTrialEndings,
  sendTrialReminders
};