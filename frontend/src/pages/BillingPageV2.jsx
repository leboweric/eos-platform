import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SEO from '../components/SEO';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { 
  CreditCard, 
  Check,
  X,
  Sparkles,
  TrendingUp,
  Users,
  Building2,
  Rocket,
  Shield,
  Zap,
  ArrowRight,
  Calendar,
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gift,
  Star,
  Info
} from 'lucide-react';
import axios from '../services/axiosConfig';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY');

// Plan data (matches backend)
const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    icon: Zap,
    color: 'blue',
    monthly: 149,
    annual: 1430,
    maxUsers: 25,
    features: [
      'Up to 25 users',
      'All core features',
      'Custom terminology',
      'Email support',
      'Monthly training webinars',
      'Data export'
    ],
    popular: false
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    icon: TrendingUp,
    color: 'green',
    monthly: 349,
    annual: 3350,
    maxUsers: 75,
    features: [
      'Up to 75 users',
      'Everything in Starter',
      'Priority support',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Quarterly business reviews'
    ],
    popular: true
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    icon: Building2,
    color: 'purple',
    monthly: 599,
    annual: 5750,
    maxUsers: 200,
    features: [
      'Up to 200 users',
      'Everything in Growth',
      'Dedicated success manager',
      'Custom onboarding',
      'SLA guarantee',
      'Advanced security features',
      'Multi-framework support'
    ],
    popular: false
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    icon: Rocket,
    color: 'orange',
    monthly: 999,
    annual: 9590,
    maxUsers: null,
    features: [
      'Unlimited users',
      'Everything in Scale',
      'White-label options',
      'Custom domain',
      '24/7 phone support',
      'Dedicated infrastructure',
      'Custom contracts',
      'Onsite training available'
    ],
    popular: false
  }
};

// Payment form component
const CheckoutForm = ({ selectedPlan, billingInterval, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(null);

  const handlePromoCode = async () => {
    if (!promoCode) return;
    
    try {
      const response = await axios.post('/subscription/apply-promo', { code: promoCode });
      setDiscount(response.data.discount);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid promo code');
      setDiscount(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Create payment method
    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: { email }
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    try {
      const response = await axios.post('/subscription/convert-trial', {
        paymentMethodId: paymentMethod.id,
        planId: selectedPlan,
        billingInterval,
        promoCode: discount ? promoCode : null
      });

      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const plan = PLANS[selectedPlan];
  const price = billingInterval === 'annual' ? plan.annual : plan.monthly;
  const discountedPrice = discount 
    ? price * (1 - discount.amount / 100)
    : price;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selected Plan Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold">{plan.name} Plan</h4>
            <p className="text-sm text-gray-600">
              {billingInterval === 'annual' ? 'Billed annually' : 'Billed monthly'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              ${billingInterval === 'annual' ? Math.round(discountedPrice / 12) : discountedPrice}
              <span className="text-sm font-normal text-gray-600">/mo</span>
            </p>
            {billingInterval === 'annual' && (
              <p className="text-sm text-green-600">
                Save ${plan.monthly * 12 - plan.annual}/year
              </p>
            )}
            {discount && (
              <Badge className="mt-1 bg-green-100 text-green-800">
                {discount.description}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Billing Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="billing@company.com"
          required
        />
      </div>

      {/* Promo Code */}
      <div className="space-y-2">
        <Label htmlFor="promo">Promo Code (Optional)</Label>
        <div className="flex gap-2">
          <Input
            id="promo"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="e.g., NINETY50"
          />
          <Button type="button" variant="outline" onClick={handlePromoCode}>
            Apply
          </Button>
        </div>
        {promoCode === 'NINETY50' && !discount && (
          <p className="text-xs text-blue-600">
            🎉 Switching from Ninety.io? This code gives you 50% off for 6 months!
          </p>
        )}
      </div>

      {/* Card Input */}
      <div className="space-y-2">
        <Label>Payment Method</Label>
        <div className="p-3 border rounded-md">
          <CardElement 
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Badge */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>Your payment information is encrypted and secure</span>
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Start {plan.name} Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {/* Terms */}
      <p className="text-xs text-center text-gray-500">
        By subscribing, you agree to our Terms of Service and Privacy Policy.
        You can cancel or change your plan anytime.
      </p>
    </form>
  );
};

// Main billing page component
const BillingPageV2 = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [currentUsers, setCurrentUsers] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchUserCount();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/subscription/status');
      setSubscription(response.data);
      
      // If no active subscription in DB, try to sync from Stripe
      if (response.data.status !== 'active') {
        console.log('No active subscription found, attempting to sync from Stripe...');
        try {
          const syncResponse = await axios.post('/subscription/sync');
          if (syncResponse.data.success) {
            // Refetch subscription status after sync
            const updatedResponse = await axios.get('/subscription/status');
            setSubscription(updatedResponse.data);
            console.log('Subscription synced successfully');
          }
        } catch (syncError) {
          // Sync failed, likely no subscription in Stripe either
          console.log('No subscription found in Stripe');
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCount = async () => {
    try {
      const response = await axios.get('/organizations/current');
      setCurrentUsers(response.data.userCount || 1);
      
      // Auto-select recommended plan
      if (response.data.userCount <= 25) setSelectedPlan('starter');
      else if (response.data.userCount <= 75) setSelectedPlan('growth');
      else if (response.data.userCount <= 200) setSelectedPlan('scale');
      else setSelectedPlan('enterprise');
    } catch (error) {
      console.error('Failed to fetch user count:', error);
    }
  };

  const handleSuccess = (data) => {
    // Show success message and redirect
    navigate('/dashboard', { 
      state: { 
        message: 'Subscription activated successfully! Welcome to AXP.',
        type: 'success'
      }
    });
  };

  const openCustomerPortal = async () => {
    try {
      const response = await axios.post('/subscription/portal');
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show active subscription management if user has one
  if (subscription?.status === 'active') {
    const activePlan = PLANS[subscription.plan_id] || PLANS.starter;
    
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <SEO 
          title="Manage Subscription"
          description="Manage your AXP subscription, update payment methods, and download invoices."
          noindex={true}
        />
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            Your Subscription
          </h1>
          <p className="text-xl text-gray-600">
            You're currently on the {activePlan.name} plan
          </p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{activePlan.name} Plan</span>
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Status</span>
              <span className="font-medium capitalize">{subscription.status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Users</span>
              <span className="font-medium">
                {currentUsers} / {activePlan.maxUsers || 'Unlimited'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Price</span>
              <span className="font-medium">
                ${activePlan.monthly}/month
              </span>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button 
                onClick={openCustomerPortal}
                className="w-full"
                variant="default"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
              <p className="text-sm text-gray-500 text-center">
                Update payment method, download invoices, or cancel subscription
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            View Available Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <SEO 
        title="Pricing"
        description="Simple, transparent pricing for AXP. Plans starting at $149/month. Save 56% compared to Ninety.io. All plans include a 30-day free trial."
        keywords="AXP pricing, business software pricing, EOS alternative cost, Ninety.io alternative pricing"
      />
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Simple, transparent pricing that scales with your business
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            className={`px-4 py-2 rounded-md transition-all ${
              billingInterval === 'monthly' 
                ? 'bg-white shadow-sm' 
                : 'text-gray-600'
            }`}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 rounded-md transition-all ${
              billingInterval === 'annual' 
                ? 'bg-white shadow-sm' 
                : 'text-gray-600'
            }`}
            onClick={() => setBillingInterval('annual')}
          >
            Annual
            <Badge className="ml-2 bg-green-100 text-green-800" variant="secondary">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      {!showCheckout ? (
        <>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {Object.values(PLANS).map((plan) => {
              const isRecommended = selectedPlan === plan.id;
              const Icon = plan.icon;
              const canSelect = !plan.maxUsers || currentUsers <= plan.maxUsers;
              
              return (
                <Card 
                  key={plan.id}
                  className={`
                    relative cursor-pointer transition-all
                    ${isRecommended ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
                    ${!canSelect ? 'opacity-50' : ''}
                  `}
                  onClick={() => canSelect && setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`h-8 w-8 text-${plan.color}-600`} />
                      {isRecommended && (
                        <CheckCircle2 className="h-6 w-6 text-blue-500" />
                      )}
                    </div>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">
                        ${billingInterval === 'annual' 
                          ? Math.round(plan.annual / 12)
                          : plan.monthly
                        }
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {plan.maxUsers 
                        ? `Up to ${plan.maxUsers} users`
                        : 'Unlimited users'
                      }
                    </p>
                    {!canSelect && (
                      <Badge variant="secondary" className="mt-2 bg-red-100 text-red-700">
                        Too many users
                      </Badge>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full mt-4"
                      variant={isRecommended ? 'default' : 'outline'}
                      disabled={!canSelect}
                    >
                      {isRecommended ? 'Selected' : 'Select'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <Button 
              size="lg"
              onClick={() => setShowCheckout(true)}
              className="min-w-[200px]"
            >
              Continue to Payment
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-gray-500 mt-4">
              <Shield className="inline h-4 w-4 mr-1" />
              30-day money-back guarantee • Cancel anytime
            </p>
          </div>
        </>
      ) : (
        /* Checkout Form */
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => setShowCheckout(false)}
            className="mb-4"
          >
            ← Back to plans
          </Button>
          
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Subscription</CardTitle>
              <CardDescription>
                Your trial ends soon. Enter payment details to continue without interruption.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <CheckoutForm 
                  selectedPlan={selectedPlan}
                  billingInterval={billingInterval}
                  onSuccess={handleSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trust Badges */}
      <div className="mt-12 pt-8 border-t">
        <div className="flex justify-center items-center gap-8 text-gray-500">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="text-sm">PCI Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <span className="text-sm">30-Day Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPageV2;