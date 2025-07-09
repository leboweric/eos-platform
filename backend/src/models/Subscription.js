const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true // Will be null during trial, set after trial ends
  },
  stripePaymentMethodId: {
    type: String,
    required: true
  },
  stripeSubscriptionItemId: {
    type: String,
    sparse: true // The ID of the subscription item for quantity updates
  },
  status: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'],
    default: 'trialing'
  },
  planId: {
    type: String,
    default: 'pro', // Can be expanded later for different tiers
    enum: ['pro', 'enterprise']
  },
  userCount: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  pricePerUser: {
    type: Number,
    default: 5 // $5 per user
  },
  trialStartDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    }
  },
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  cancelReason: {
    type: String
  },
  lastReminderSent: {
    type: String,
    enum: ['7_days', '3_days', '1_day', 'trial_ended']
  },
  billingEmail: {
    type: String,
    required: true
  },
  lastPaymentStatus: {
    type: String
  },
  lastPaymentAmount: {
    type: Number
  },
  lastPaymentDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate days remaining in trial
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (this.status !== 'trialing') return 0;
  const now = new Date();
  const endDate = new Date(this.trialEndDate);
  const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysRemaining);
});

// Check if trial has expired
subscriptionSchema.virtual('isTrialExpired').get(function() {
  if (this.status !== 'trialing') return false;
  return new Date() > new Date(this.trialEndDate);
});

// Calculate total monthly cost
subscriptionSchema.virtual('monthlyTotal').get(function() {
  return this.userCount * this.pricePerUser;
});

// Method to check which reminder should be sent
subscriptionSchema.methods.getRequiredReminder = function() {
  if (this.status !== 'trialing') return null;
  
  const daysRemaining = this.trialDaysRemaining;
  
  if (daysRemaining <= 1 && this.lastReminderSent !== '1_day' && this.lastReminderSent !== 'trial_ended') {
    return '1_day';
  }
  if (daysRemaining <= 3 && daysRemaining > 1 && this.lastReminderSent !== '3_days' && this.lastReminderSent !== '1_day') {
    return '3_days';
  }
  if (daysRemaining <= 7 && daysRemaining > 3 && !this.lastReminderSent) {
    return '7_days';
  }
  if (daysRemaining === 0 && this.lastReminderSent !== 'trial_ended') {
    return 'trial_ended';
  }
  
  return null;
};

// Indexes for efficient queries
subscriptionSchema.index({ organization: 1 });
subscriptionSchema.index({ stripeCustomerId: 1 });
subscriptionSchema.index({ status: 1, trialEndDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;