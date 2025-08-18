import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle,
  Download,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

// Initialize Stripe (use your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY');

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Card input component
const CardInputForm = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [billingEmail, setBillingEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    // Create payment method
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: {
        email: billingEmail
      }
    });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
      return;
    }

    // Send payment method to backend
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/subscription/start-trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          billingEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start trial');
      }

      onSuccess(data.subscription);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Billing Email
        </label>
        <input
          id="email"
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="billing@company.com"
          required
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Card Information
        </label>
        <div className="p-3 border rounded-md">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Start 30-Day Free Trial'
        )}
      </Button>

      <p className="text-sm text-gray-500 text-center">
        Your card will be charged based on our flat-rate pricing tiers after the 30-day trial ends.
        Cancel anytime.
      </p>
    </form>
  );
};

// Flat-rate pricing tiers
const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    maxUsers: 25,
    monthlyPrice: 149,
    annualPrice: 1430
  },
  growth: {
    name: 'Growth',
    maxUsers: 75,
    monthlyPrice: 349,
    annualPrice: 3350
  },
  scale: {
    name: 'Scale',
    maxUsers: 200,
    monthlyPrice: 599,
    annualPrice: 5750
  },
  enterprise: {
    name: 'Enterprise',
    maxUsers: null, // unlimited
    monthlyPrice: 999,
    annualPrice: 9590
  }
};

// Get the appropriate pricing tier based on user count
const getPricingTier = (userCount) => {
  if (userCount <= 25) return PRICING_TIERS.starter;
  if (userCount <= 75) return PRICING_TIERS.growth;
  if (userCount <= 200) return PRICING_TIERS.scale;
  return PRICING_TIERS.enterprise;
};

const BillingPage = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingHistory, setBillingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('subscription');

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchBillingHistory();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      
      if (data.hasSubscription) {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/subscription/billing-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      const data = await response.json();
      setBillingHistory(data.invoices || []);
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const response = await fetch(`${API_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          reason: 'User requested cancellation'
        })
      });

      if (response.ok) {
        alert('Subscription canceled successfully');
        fetchSubscriptionStatus();
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">
          Manage your subscription and billing information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {!subscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Start Your Free Trial</CardTitle>
                <CardDescription>
                  Get 30 days free with flat-rate pricing. Cancel anytime.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <CardInputForm onSuccess={(sub) => {
                    setSubscription(sub);
                    fetchSubscriptionStatus();
                  }} />
                </Elements>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Status</span>
                    <Badge variant={
                      subscription.status === 'active' ? 'default' :
                      subscription.status === 'trialing' ? 'secondary' :
                      'destructive'
                    }>
                      {subscription.status}
                    </Badge>
                  </div>
                  
                  {subscription.status === 'trialing' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Trial Ends</span>
                        <span>{format(new Date(subscription.trialEndDate), 'PPP')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Days Remaining</span>
                        <span className="text-2xl font-bold text-primary">
                          {subscription.trialDaysRemaining}
                        </span>
                      </div>
                      {subscription.isTrialExpired && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Your trial has expired. Your card will be charged soon.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-medium">Number of Users</span>
                    <span>{subscription.userCount || 1}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Pricing Plan</span>
                    <span className="font-semibold">
                      {(() => {
                        const tier = getPricingTier(subscription.userCount || 1);
                        return `${tier.name} (up to ${tier.maxUsers || 'unlimited'} users)`;
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Monthly Total</span>
                    <span className="text-lg font-semibold">
                      ${getPricingTier(subscription.userCount || 1).monthlyPrice}/month
                    </span>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>You're saving vs. per-user pricing!</strong><br/>
                      With {subscription.userCount || 1} users at $5/user, you'd pay ${(subscription.userCount || 1) * 5}/month.
                      You're only paying ${getPricingTier(subscription.userCount || 1).monthlyPrice}/month.
                    </p>
                  </div>

                  {subscription.currentPeriodEnd && subscription.status === 'active' && (
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Current Period Ends</span>
                      <span>{format(new Date(subscription.currentPeriodEnd), 'PPP')}</span>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelSubscription}
                      disabled={subscription.status === 'canceled'}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Tiers</CardTitle>
                  <CardDescription>
                    Our flat-rate pricing saves you money as you grow
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(PRICING_TIERS).map(([key, tier]) => {
                      const userCount = subscription?.userCount || 1;
                      const isCurrentTier = getPricingTier(userCount).name === tier.name;
                      
                      return (
                        <div 
                          key={key} 
                          className={`p-3 rounded-lg border ${
                            isCurrentTier 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{tier.name}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                (up to {tier.maxUsers || 'unlimited'} users)
                              </span>
                              {isCurrentTier && (
                                <Badge className="ml-2" variant="default">Current Plan</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${tier.monthlyPrice}/month</div>
                              <div className="text-xs text-gray-500">or ${tier.annualPrice}/year</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>
                    Update your payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise}>
                    <p className="text-sm text-gray-500">
                      Payment method update coming soon...
                    </p>
                  </Elements>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>
                Download invoices and view payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No billing history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {billingHistory.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          ${invoice.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(invoice.date), 'PPP')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          invoice.status === 'paid' ? 'default' : 'destructive'
                        }>
                          {invoice.status}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BillingPage;