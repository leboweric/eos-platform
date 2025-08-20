import { query } from '../config/database.js';
import { PLAN_FEATURES } from '../config/stripe-flat-rate.js';

/**
 * Check if organization can add more users based on their plan
 * @param {string} organizationId 
 * @returns {Object} { canAddUsers, currentCount, maxUsers, planName, message, upgradeRequired }
 */
export const checkUserLimit = async (organizationId) => {
  try {
    // Get current user count and subscription info
    const result = await query(
      `SELECT 
        o.subscription_tier,
        o.trial_ends_at,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
        (SELECT COUNT(*) FROM invitations 
         WHERE organization_id = o.id 
         AND expires_at > NOW() 
         AND accepted_at IS NULL) as pending_invites
      FROM organizations o
      WHERE o.id = $1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }

    const { subscription_tier, trial_ends_at, user_count, pending_invites } = result.rows[0];
    const currentCount = parseInt(user_count);
    const pendingCount = parseInt(pending_invites);
    const totalExpected = currentCount + pendingCount;

    // During trial, use Growth plan limits (75 users) to be generous
    const planId = subscription_tier === 'trial' ? 'growth' : subscription_tier;
    const planFeatures = PLAN_FEATURES[planId];

    // If no plan found or enterprise (unlimited), allow
    if (!planFeatures || !planFeatures.max_users) {
      return {
        canAddUsers: true,
        currentCount,
        pendingCount,
        maxUsers: null,
        planName: planId,
        isUnlimited: true
      };
    }

    const maxUsers = planFeatures.max_users;
    
    // Check if adding one more user would exceed the limit
    if (totalExpected >= maxUsers) {
      // Determine the recommended plan
      let recommendedPlan = 'growth';
      if (totalExpected >= 25) recommendedPlan = 'growth';
      if (totalExpected >= 75) recommendedPlan = 'scale';
      if (totalExpected >= 200) recommendedPlan = 'enterprise';

      return {
        canAddUsers: false,
        currentCount,
        pendingCount,
        maxUsers,
        planName: planFeatures.name,
        planId,
        message: `Your ${planFeatures.name} plan supports up to ${maxUsers} users. You currently have ${currentCount} users${pendingCount > 0 ? ` and ${pendingCount} pending invitation${pendingCount > 1 ? 's' : ''}` : ''}.`,
        upgradeRequired: true,
        recommendedPlan,
        isTrialUser: subscription_tier === 'trial',
        trialEndsAt: trial_ends_at
      };
    }

    // Can add users
    const remainingSlots = maxUsers - totalExpected;
    
    return {
      canAddUsers: true,
      currentCount,
      pendingCount,
      maxUsers,
      remainingSlots,
      planName: planFeatures.name,
      planId,
      message: remainingSlots === 1 
        ? `You have 1 user slot remaining on your ${planFeatures.name} plan.`
        : `You have ${remainingSlots} user slots remaining on your ${planFeatures.name} plan.`
    };

  } catch (error) {
    console.error('Error checking user limit:', error);
    // On error, allow the operation but log it
    return {
      canAddUsers: true,
      error: error.message
    };
  }
};

/**
 * Get the next plan tier based on user count
 * @param {number} userCount 
 * @returns {string} plan ID
 */
export const getRecommendedPlan = (userCount) => {
  if (userCount <= 25) return 'starter';
  if (userCount <= 75) return 'growth';
  if (userCount <= 200) return 'scale';
  return 'enterprise';
};