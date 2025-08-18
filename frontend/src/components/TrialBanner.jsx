import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  X, 
  Clock, 
  Sparkles, 
  CreditCard,
  Gift,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import axios from '../services/axiosConfig';

const TrialBanner = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptionStatus();
    
    // Check if already dismissed this session
    const dismissedSession = sessionStorage.getItem('trialBannerDismissed');
    if (dismissedSession) {
      setDismissed(true);
    }
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/subscription/status');
      
      // Also check headers for trial info
      const trialActive = response.headers['x-trial-active'] === 'true';
      const daysRemaining = parseInt(response.headers['x-trial-days-remaining'] || 0);
      const accountStatus = response.headers['x-account-status'];
      const subscriptionTier = response.headers['x-subscription-tier'];
      
      setSubscription({
        ...response.data,
        trialActive,
        daysRemaining,
        accountStatus,
        subscriptionTier,
        hasSubscription: response.data.hasSubscription || trialActive
      });
    } catch (error) {
      // Silently fail for non-critical errors
      if (error.response?.status !== 429) {
        console.error('Failed to fetch subscription:', error);
      }
      
      // Set default trial for new users
      setSubscription({
        trialActive: true,
        daysRemaining: 30,
        accountStatus: 'trial',
        subscriptionTier: 'trial',
        hasSubscription: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trialBannerDismissed', 'true');
  };

  // TEMPORARILY DISABLED FOR TESTING - Comment out the entire trial banner
  return null;
  
  /* Original code commented out for testing
  if (loading || dismissed || !subscription) {
    return null;
  }

  // Don't show for active paid subscriptions
  if (subscription.accountStatus === 'active' && subscription.subscriptionTier !== 'trial') {
    return null;
  }
  */

  const daysRemaining = subscription.daysRemaining || subscription.trialDaysRemaining || 0;
  const isUrgent = daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = subscription.accountStatus?.startsWith('expired') || daysRemaining <= 0;
  const isLastDay = daysRemaining === 1;

  // Determine the right message and style
  let variant = 'default';
  let icon = Clock;
  let message = '';
  let ctaText = 'Upgrade Now';
  
  if (isExpired) {
    variant = 'destructive';
    icon = AlertCircle;
    message = subscription.accountStatus === 'expired_no_payment' 
      ? 'Your 30-day free trial has ended. Upgrade now to continue using AXP.'
      : 'Your trial has expired. Add payment method to restore access.';
    ctaText = 'Restore Access';
  } else if (isLastDay) {
    variant = 'destructive';
    icon = AlertCircle;
    message = '⏰ Last day of your trial! Upgrade now to keep your data and continue without interruption.';
    ctaText = 'Upgrade Today';
  } else if (isUrgent) {
    variant = 'warning';
    icon = Clock;
    message = `Only ${daysRemaining} days left in your trial. Lock in your rate now!`;
    ctaText = 'Secure Your Rate';
  } else if (daysRemaining <= 14) {
    variant = 'default';
    icon = Sparkles;
    message = `${daysRemaining} days remaining in your trial. Upgrade early and save 20% on your first year!`;
    ctaText = 'Get Early Bird Discount';
  } else {
    // More than 14 days - show benefits
    variant = 'default';
    icon = Gift;
    message = `You have ${daysRemaining} days left to explore AXP. Enjoying it? Save 20% by upgrading early!`;
    ctaText = 'View Pricing';
  }

  const IconComponent = icon;

  return (
    <Alert 
      variant={variant} 
      className={`
        mb-4 relative transition-all duration-300
        ${isExpired ? 'border-red-500 bg-red-50' : ''}
        ${isUrgent ? 'border-orange-500 bg-orange-50' : ''}
        ${isLastDay ? 'animate-pulse' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <IconComponent className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <span className="font-medium">{message}</span>
              
              {/* Show pricing reminder for non-expired trials */}
              {!isExpired && (
                <div className="mt-2 flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Save vs Ninety.io: $851/month
                  </Badge>
                  <span className="text-xs text-gray-600">
                    Starting at just $149/month (unlimited features)
                  </span>
                </div>
              )}
              
              {/* Special offer for early conversion */}
              {!isExpired && daysRemaining > 7 && (
                <div className="mt-2 p-2 bg-green-100 rounded-md">
                  <span className="text-xs text-green-800 font-medium">
                    🎉 Limited Time: Switch from Ninety.io and get 50% off for 6 months!
                  </span>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isExpired ? 'destructive' : isUrgent ? 'default' : 'secondary'}
            onClick={() => navigate('/billing')}
            className="whitespace-nowrap"
          >
            <CreditCard className="h-4 w-4 mr-1" />
            {ctaText}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          
          {!isExpired && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default TrialBanner;