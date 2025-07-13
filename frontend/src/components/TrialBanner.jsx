import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import axios from '../services/axiosSetup';

const TrialBanner = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/api/v1/subscription/status');
      
      if (response.data.hasSubscription) {
        setSubscription(response.data);
      }
    } catch (error) {
      // Silently fail for 429 errors - not critical for UI
      if (error.response?.status !== 429) {
        console.error('Failed to fetch subscription:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || !subscription || subscription.status !== 'trialing') {
    return null;
  }

  const daysRemaining = subscription.trialDaysRemaining;
  const isUrgent = daysRemaining <= 7;
  const isExpired = subscription.isTrialExpired;

  return (
    <Alert variant={isExpired ? 'destructive' : isUrgent ? 'warning' : 'default'} className="mb-4 relative">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="pr-8">
        {isExpired ? (
          <>
            Your free trial has expired. 
            <Link to="/billing" className="font-medium underline ml-1">
              Add payment method
            </Link> to continue using EOS Platform.
            {subscription.userCount && subscription.monthlyTotal && (
              <span className="ml-1">
                (${subscription.monthlyTotal}/month for {subscription.userCount} users)
              </span>
            )}
          </>
        ) : (
          <>
            Your free trial ends in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}. 
            <Link to="/billing" className="font-medium underline ml-1">
              Add payment method
            </Link> to ensure uninterrupted service.
            {subscription.userCount && subscription.monthlyTotal && (
              <span className="ml-1">
                (${subscription.monthlyTotal}/month for {subscription.userCount} users)
              </span>
            )}
          </>
        )}
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};

export default TrialBanner;