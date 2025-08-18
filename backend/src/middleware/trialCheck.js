import { query } from '../config/database.js';

// Check trial status and add to request
export const checkTrialStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.organization_id) {
      return next();
    }

    const result = await query(
      `SELECT 
        o.trial_started_at,
        o.trial_ends_at,
        o.subscription_tier,
        s.status as subscription_status,
        s.trial_type,
        s.plan_id,
        CASE 
          WHEN o.trial_ends_at > NOW() THEN true
          ELSE false
        END as trial_active,
        EXTRACT(DAY FROM (o.trial_ends_at - NOW())) as days_remaining,
        CASE
          WHEN s.status = 'active' THEN 'active'
          WHEN o.trial_ends_at > NOW() THEN 'trial'
          WHEN o.trial_ends_at <= NOW() AND s.stripe_customer_id IS NULL THEN 'expired_no_payment'
          WHEN o.trial_ends_at <= NOW() AND s.status = 'trialing' THEN 'expired_pending_conversion'
          ELSE 'expired'
        END as account_status
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      WHERE o.id = $1`,
      [req.user.organization_id]
    );

    if (result.rows.length > 0) {
      req.trial = result.rows[0];
      
      // Add headers for client to know trial status
      res.setHeader('X-Trial-Active', req.trial.trial_active);
      res.setHeader('X-Trial-Days-Remaining', Math.max(0, Math.floor(req.trial.days_remaining || 0)));
      res.setHeader('X-Account-Status', req.trial.account_status);
      res.setHeader('X-Subscription-Tier', req.trial.subscription_tier || 'trial');
    }

    next();
  } catch (error) {
    console.error('Trial check error:', error);
    // Don't block request on trial check failure
    next();
  }
};

// Enforce trial limits (use selectively on premium features)
export const enforceTrialLimits = (feature) => {
  return async (req, res, next) => {
    try {
      // First check trial status
      if (!req.trial) {
        await checkTrialStatus(req, res, () => {});
      }

      // Define feature limits for trial accounts
      const trialLimits = {
        users: 10,
        priorities: 25,
        scorecard_metrics: 20,
        documents: 50,
        document_size_mb: 5,
        departments: 3,
        custom_frameworks: false,
        ai_assistant: false,
        advanced_analytics: false,
        white_label: false
      };

      // Check if account has active subscription
      if (req.trial && req.trial.account_status === 'active') {
        return next(); // No limits for paid accounts
      }

      // TEMPORARILY DISABLED FOR TESTING - Skip trial expiration check
      /*
      // Check if trial is expired
      if (req.trial && req.trial.account_status.startsWith('expired')) {
        // Allow read-only access for expired trials
        if (req.method === 'GET') {
          return next();
        }
        
        return res.status(402).json({
          error: 'Trial expired',
          message: 'Your 30-day trial has ended. Please upgrade to continue.',
          upgradeUrl: '/billing',
          accountStatus: req.trial.account_status
        });
      }
      */

      // Check specific feature limits during trial
      if (feature && trialLimits[feature] !== undefined) {
        // For boolean features
        if (typeof trialLimits[feature] === 'boolean' && !trialLimits[feature]) {
          return res.status(403).json({
            error: 'Premium feature',
            message: `${feature.replace('_', ' ')} is not available during trial`,
            upgradeUrl: '/billing'
          });
        }

        // For numeric limits, would need to check current usage
        // This would be feature-specific implementation
        req.trialLimit = trialLimits[feature];
      }

      next();
    } catch (error) {
      console.error('Trial enforcement error:', error);
      next(error);
    }
  };
};

// Middleware to send trial reminder emails
export const checkTrialReminders = async (req, res, next) => {
  try {
    if (!req.user || !req.trial) {
      return next();
    }

    const daysRemaining = Math.floor(req.trial.days_remaining || 0);
    
    // Check if we need to send reminder emails
    if (req.trial.trial_active && req.trial.subscription_status === 'trialing') {
      const result = await query(
        `SELECT last_reminder_sent FROM subscriptions WHERE organization_id = $1`,
        [req.user.organization_id]
      );

      if (result.rows.length > 0) {
        const lastReminder = result.rows[0].last_reminder_sent;
        let shouldSendReminder = false;
        let reminderType = null;

        if (daysRemaining <= 1 && lastReminder !== '1_day' && lastReminder !== 'trial_ended') {
          shouldSendReminder = true;
          reminderType = '1_day';
        } else if (daysRemaining <= 3 && daysRemaining > 1 && lastReminder !== '3_days' && lastReminder !== '1_day') {
          shouldSendReminder = true;
          reminderType = '3_days';
        } else if (daysRemaining <= 7 && daysRemaining > 3 && !lastReminder) {
          shouldSendReminder = true;
          reminderType = '7_days';
        }

        if (shouldSendReminder && reminderType) {
          // Update reminder status (email sending would be handled by a background job)
          await query(
            `UPDATE subscriptions SET last_reminder_sent = $1 WHERE organization_id = $2`,
            [reminderType, req.user.organization_id]
          );
          
          // Set flag for potential UI notification
          req.trialReminder = {
            type: reminderType,
            daysRemaining
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('Trial reminder check error:', error);
    next();
  }
};