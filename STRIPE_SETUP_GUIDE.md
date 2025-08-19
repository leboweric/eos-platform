# Complete Stripe Setup Guide for AXP Flat-Rate Pricing

## Prerequisites
- Stripe account (sign up at https://stripe.com)
- Access to Stripe Dashboard
- Your environment variables file ready

## Step 1: Access Your Stripe Dashboard
1. Log in to https://dashboard.stripe.com
2. Toggle between **Test mode** and **Live mode** using the switch in the top-right
3. **Start in Test mode** for initial setup

## Step 2: Create Your Products (One for Each Tier)

### Create Starter Product
1. Navigate to **Products** → **Add product**
2. Fill in:
   - **Name**: `AXP Starter`
   - **Description**: `Adaptive Execution Platform - Starter Plan (Up to 25 users)`
   - **Image**: Upload your logo (optional)
3. Under **Pricing**:
   - Click **Add another price**
   - Create TWO prices:

#### Starter Monthly Price:
- **Pricing model**: Standard pricing
- **Price**: `149.00`
- **Currency**: USD
- **Billing period**: Monthly
- Click **Add price**

#### Starter Annual Price:
- **Pricing model**: Standard pricing  
- **Price**: `1430.00`
- **Currency**: USD
- **Billing period**: Yearly
- **Description**: `Save $358/year (20% discount)`
- Click **Add price**

4. Click **Save product**

### Create Growth Product
1. Click **Add product**
2. Fill in:
   - **Name**: `AXP Growth`
   - **Description**: `Adaptive Execution Platform - Growth Plan (Up to 75 users)`

#### Growth Monthly Price:
- **Price**: `349.00`
- **Billing period**: Monthly

#### Growth Annual Price:
- **Price**: `3350.00`
- **Billing period**: Yearly
- **Description**: `Save $838/year (20% discount)`

### Create Scale Product
1. Click **Add product**
2. Fill in:
   - **Name**: `AXP Scale`
   - **Description**: `Adaptive Execution Platform - Scale Plan (Up to 200 users)`

#### Scale Monthly Price:
- **Price**: `599.00`
- **Billing period**: Monthly

#### Scale Annual Price:
- **Price**: `5750.00`
- **Billing period**: Yearly
- **Description**: `Save $1,438/year (20% discount)`

### Create Enterprise Product
1. Click **Add product**
2. Fill in:
   - **Name**: `AXP Enterprise`
   - **Description**: `Adaptive Execution Platform - Enterprise Plan (Unlimited users)`

#### Enterprise Monthly Price:
- **Price**: `999.00`
- **Billing period**: Monthly

#### Enterprise Annual Price:
- **Price**: `9590.00`
- **Billing period**: Yearly
- **Description**: `Save $2,398/year (20% discount)`

## Step 3: Copy Your Price IDs

After creating all products, you'll need to copy the Price IDs:

1. Go to **Products** in Stripe Dashboard
2. Click on each product (e.g., "AXP Starter")
3. In the **Pricing** section, you'll see your prices listed
4. Click on a price (e.g., "$149.00 per month")
5. Copy the **Price ID** (looks like: `price_1O4ABC123def456`)
6. Record all 8 price IDs:

```bash
# Add these to your .env file:

# Starter Plan
STRIPE_STARTER_MONTHLY=price_xxxxxxxxxxxxxx
STRIPE_STARTER_ANNUAL=price_xxxxxxxxxxxxxx

# Growth Plan  
STRIPE_GROWTH_MONTHLY=price_xxxxxxxxxxxxxx
STRIPE_GROWTH_ANNUAL=price_xxxxxxxxxxxxxx

# Scale Plan
STRIPE_SCALE_MONTHLY=price_xxxxxxxxxxxxxx
STRIPE_SCALE_ANNUAL=price_xxxxxxxxxxxxxx

# Enterprise Plan
STRIPE_ENTERPRISE_MONTHLY=price_xxxxxxxxxxxxxx
STRIPE_ENTERPRISE_ANNUAL=price_xxxxxxxxxxxxxx
```

## Step 4: Create Promotional Coupons

### Ninety.io Escape Plan (50% off for 6 months)
1. Go to **Coupons** → **New**
2. Fill in:
   - **Coupon ID**: `NINETY50`
   - **Name**: `Ninety.io Escape Plan`
   - **Type**: Percentage discount
   - **Percent off**: `50`
   - **Duration**: Repeating
   - **Duration in months**: `6`
   - **Redeem by**: Set to 6 months from now
3. Click **Create coupon**

### Early Bird Discount (20% off first year)
1. Create new coupon:
   - **Coupon ID**: `EARLY20`
   - **Name**: `Early Bird Discount`
   - **Percent off**: `20`
   - **Duration**: Repeating
   - **Duration in months**: `12`

### Partner Discount (30% off forever)
1. Create new coupon:
   - **Coupon ID**: `PARTNER30`
   - **Name**: `Partner Program`
   - **Percent off**: `30`
   - **Duration**: Forever

## Step 5: Get Your API Keys

### Test Keys (for development)
1. Go to **Developers** → **API keys**
2. In the **Standard keys** section, copy:
   - **Publishable key**: `pk_test_xxxxxxxxxx`
   - **Secret key**: Click **Reveal test key** → `sk_test_xxxxxxxxxx`

### Live Keys (for production)
1. Switch to **Live mode** (toggle in top-right)
2. Go to **Developers** → **API keys**
3. Copy your live keys:
   - **Publishable key**: `pk_live_xxxxxxxxxx`
   - **Secret key**: `sk_live_xxxxxxxxxx` (keep this secure!)

Add to your `.env` files:

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx  # Use sk_live_ for production

# Frontend .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx  # Use pk_live_ for production
```

## Step 6: Configure Webhooks

Webhooks let Stripe notify your app about subscription changes:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Fill in:
   - **Endpoint URL**: 
     - Development: `https://your-ngrok-url.ngrok.io/api/v1/webhooks/stripe`
     - Production: `https://eos-platform-production.up.railway.app/api/v1/webhooks/stripe`
   - **Description**: `Production webhook for subscription events`
4. Under **Events to send**, select:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.trial_will_end`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

## Step 7: Configure Customer Portal

Allow customers to manage their subscriptions:

1. Go to **Settings** → **Billing** → **Customer portal**
2. Click **Activate link**
3. Configure:
   - **Functionality**:
     - ✅ Allow customers to update payment methods
     - ✅ Allow customers to update billing addresses
     - ✅ Allow customers to view billing history
     - ✅ Allow customers to download invoices
   - **Cancellation**:
     - ✅ Allow customers to cancel subscriptions
     - Cancellation policy: Immediate
   - **Subscription changes**:
     - ✅ Allow switching plans
     - Products/prices: Select all your AXP plans
     - Proration: Prorate on upgrade and downgrade
4. Click **Save**

## Step 8: Configure Tax Settings (Important!)

1. Go to **Settings** → **Tax**
2. Consider using **Stripe Tax** for automatic tax calculation:
   - Click **Activate Stripe Tax**
   - Add your business address
   - Select regions where you have tax obligations
3. Or configure manual tax rates if preferred

## Step 9: Set Up Payment Methods

1. Go to **Settings** → **Payment methods**
2. Ensure these are enabled:
   - ✅ Card payments
   - ✅ Link (Stripe's fast checkout)
   - Consider enabling:
     - ACH Direct Debit (for enterprise)
     - SEPA (for EU customers)

## Step 10: Testing Your Setup

### Test Card Numbers
Use these in TEST mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`
- Any future expiry date and any 3-digit CVC

### Test Flow
1. Create a test account on your platform
2. Let trial expire or manually trigger upgrade
3. Select a plan and enter test card
4. Apply promo code `NINETY50`
5. Verify subscription created in Stripe Dashboard

## Step 11: Go Live Checklist

Before switching to production:

- [ ] All products created with correct prices
- [ ] Price IDs copied to production `.env`
- [ ] Webhook endpoint configured for production URL
- [ ] Customer portal activated and configured
- [ ] Tax settings configured
- [ ] Tested complete flow in test mode
- [ ] Live API keys ready (not committed to code!)
- [ ] SSL certificate active on production domain

## Step 12: Monitor and Manage

### Key Metrics to Watch
- **Payments** → Monitor successful/failed payments
- **Customers** → View subscriber list
- **Reports** → Track MRR, churn, LTV

### Common Tasks
- **Refund a payment**: Payments → Click payment → Refund
- **Cancel subscription**: Customers → Click customer → Cancel subscription
- **Add discount**: Customers → Click customer → Add coupon
- **Update card**: Customer portal link or manual update

## Environment Variables Summary

```bash
# Backend (.env)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
STRIPE_STARTER_MONTHLY=price_xxxxxxxxxx
STRIPE_STARTER_ANNUAL=price_xxxxxxxxxx
STRIPE_GROWTH_MONTHLY=price_xxxxxxxxxx
STRIPE_GROWTH_ANNUAL=price_xxxxxxxxxx
STRIPE_SCALE_MONTHLY=price_xxxxxxxxxx
STRIPE_SCALE_ANNUAL=price_xxxxxxxxxx
STRIPE_ENTERPRISE_MONTHLY=price_xxxxxxxxxx
STRIPE_ENTERPRISE_ANNUAL=price_xxxxxxxxxx

# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
```

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Test Cards**: https://stripe.com/docs/testing
- **Webhook Testing**: Use Stripe CLI for local testing
- **API Reference**: https://stripe.com/docs/api

## Security Best Practices

1. **Never commit API keys** to your repository
2. **Use environment variables** for all keys
3. **Restrict API key permissions** in production
4. **Enable 2FA** on your Stripe account
5. **Set up alerts** for unusual activity
6. **Regularly rotate** API keys
7. **Use webhook signatures** to verify requests
8. **Enable HTTPS** for all production endpoints

---

## Quick Reference: Price Points

| Plan       | Monthly | Annual    | Savings/Year | Max Users |
|------------|---------|-----------|--------------|-----------|
| Starter    | $149    | $1,430    | $358         | 25        |
| Growth     | $349    | $3,350    | $838         | 75        |
| Scale      | $599    | $5,750    | $1,438       | 200       |
| Enterprise | $999    | $9,590    | $2,398       | Unlimited |

## Ninety.io Comparison (50 users)

- **Ninety.io**: $800/month ($16 × 50 users)
- **AXP Growth**: $349/month
- **Monthly Savings**: $451
- **Annual Savings**: $5,412
- **Percentage Saved**: 56%

This positions AXP as the smart, affordable alternative! 🚀