# Stripe Implementation Guide

## Overview

This guide describes how to implement Stripe payment processing for the boxd-events platform. The implementation uses **Stripe Connect** with **Express accounts**, allowing event hosts to collect registration fees while the platform takes a 6% application fee.

## Architecture

### Stripe Connect Model

- **Platform Account**: The main Stripe account for boxd-events
- **Connected Accounts**: Express Stripe accounts for event hosts
- **Payment Flow**: Customers pay hosts directly; platform takes application fee
- **Platform Fee**: 6% of each registration fee

### User Flow

1. **Event Host Setup**
   - Host creates an event and wants to add a registration fee
   - If host doesn't have Stripe account: guided to create Express account
   - If host has existing Stripe account: link existing account
   - Once connected, host can set registration fee for events

2. **Event Registration**
   - User views event with registration fee
   - User clicks "Register" and is redirected to Stripe Checkout
   - Payment is processed via connected account
   - Platform fee (6%) is automatically deducted
   - User's RSVP status is updated to 'paid' via webhook

## Database Schema Changes

### 1. Add Stripe fields to `users` table

```sql
-- Add Stripe Connect account ID
ALTER TABLE users 
ADD COLUMN stripe_account_id TEXT;

-- Add Stripe account onboarding status
ALTER TABLE users
ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- Add index for Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_account_id 
ON users(stripe_account_id);

-- Add comment for documentation
COMMENT ON COLUMN users.stripe_account_id IS 'Stripe Connect Express account ID';
COMMENT ON COLUMN users.stripe_onboarding_complete IS 'Whether Stripe account onboarding is complete';
```

### 2. Update `events` table

```sql
-- Change cost from text to numeric (store in cents)
ALTER TABLE events
ALTER COLUMN cost TYPE NUMERIC(10,2);

-- Add currency field (default USD)
ALTER TABLE events
ADD COLUMN currency TEXT DEFAULT 'usd';

-- Add Stripe price ID (for recurring/reference)
ALTER TABLE events
ADD COLUMN stripe_price_id TEXT;

-- Add payment enabled flag
ALTER TABLE events
ADD COLUMN payment_required BOOLEAN DEFAULT FALSE;

-- Add index for payment queries
CREATE INDEX IF NOT EXISTS idx_events_payment_required 
ON events(payment_required) 
WHERE payment_required = TRUE;

COMMENT ON COLUMN events.cost IS 'Registration fee in dollars';
COMMENT ON COLUMN events.currency IS 'Currency code (e.g., usd)';
COMMENT ON COLUMN events.stripe_price_id IS 'Stripe Price ID for this event registration';
COMMENT ON COLUMN events.payment_required IS 'Whether payment is required to register';
```

### 3. Add payment tracking fields to `rsvps` table

```sql
-- Add Stripe payment intent ID
ALTER TABLE rsvps
ADD COLUMN stripe_payment_intent_id TEXT;

-- Add Stripe checkout session ID
ALTER TABLE rsvps
ADD COLUMN stripe_checkout_session_id TEXT;

-- Add payment amount (in cents)
ALTER TABLE rsvps
ADD COLUMN payment_amount NUMERIC(10,2);

-- Add platform fee amount (in cents)
ALTER TABLE rsvps
ADD COLUMN platform_fee_amount NUMERIC(10,2);

-- Add host payout amount (in cents)
ALTER TABLE rsvps
ADD COLUMN host_payout_amount NUMERIC(10,2);

-- Add index for payment lookups
CREATE INDEX IF NOT EXISTS idx_rsvps_stripe_payment_intent_id 
ON rsvps(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_rsvps_stripe_checkout_session_id 
ON rsvps(stripe_checkout_session_id);

COMMENT ON COLUMN rsvps.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
COMMENT ON COLUMN rsvps.stripe_checkout_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN rsvps.payment_amount IS 'Total payment amount in dollars';
COMMENT ON COLUMN rsvps.platform_fee_amount IS 'Platform fee amount (6%) in dollars';
COMMENT ON COLUMN rsvps.host_payout_amount IS 'Host payout amount after platform fee in dollars';
```

### 4. Create `stripe_connect_sessions` table (optional, for tracking)

```sql
-- Track Stripe Connect onboarding sessions
CREATE TABLE IF NOT EXISTS stripe_connect_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id TEXT,
  onboarding_link_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, expired
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, stripe_account_id)
);

CREATE INDEX idx_stripe_connect_sessions_user_id 
ON stripe_connect_sessions(user_id);

CREATE INDEX idx_stripe_connect_sessions_stripe_account_id 
ON stripe_connect_sessions(stripe_account_id);
```

## Environment Variables

Add to your `.env.local` and Supabase environment:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for development
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_... for development
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret

# Platform Configuration
STRIPE_PLATFORM_FEE_PERCENT=0.06 # 6% platform fee
```

## API Routes

### 1. Stripe Connect Account Linking

**File**: `pages/api/stripe/connect/create-account.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Check if user already has a connected account
    const { data: user } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (user.stripe_account_id && user.stripe_onboarding_complete) {
      return res.status(400).json({ 
        error: 'Stripe account already connected',
        account_id: user.stripe_account_id
      });
    }

    // Create Express account if not exists
    let accountId = user.stripe_account_id;
    
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // or get from user profile
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      
      accountId = account.id;

      // Store account ID in database
      await supabase
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', userId);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/manage-event/settings?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/manage-event/settings?stripe=success`,
      type: user.stripe_onboarding_complete ? 'account_update' : 'account_onboarding',
    });

    return res.status(200).json({ 
      url: accountLink.url,
      account_id: accountId
    });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 2. Check Stripe Account Status

**File**: `pages/api/stripe/connect/status.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (!user.stripe_account_id) {
      return res.status(200).json({ 
        connected: false,
        onboarding_complete: false
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(user.stripe_account_id);

    const isOnboardingComplete = 
      account.details_submitted && 
      account.charges_enabled && 
      account.payouts_enabled;

    // Update database if status changed
    if (isOnboardingComplete !== user.stripe_onboarding_complete) {
      await supabase
        .from('users')
        .update({ stripe_onboarding_complete: isOnboardingComplete })
        .eq('id', userId);
    }

    return res.status(200).json({
      connected: !!user.stripe_account_id,
      onboarding_complete: isOnboardingComplete,
      account_id: user.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
  } catch (error) {
    console.error('Stripe status check error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 3. Create Checkout Session for Event Registration

**File**: `pages/api/stripe/checkout/create-session.js`

```javascript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '0.06');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId, userId } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ error: 'Event ID and User ID required' });
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*, host_user:host_id (stripe_account_id, stripe_onboarding_complete)')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if payment is required
    if (!event.payment_required || !event.cost || event.cost <= 0) {
      return res.status(400).json({ error: 'Event does not require payment' });
    }

    // Check if host has Stripe account
    const host = event.host_user;
    if (!host.stripe_account_id || !host.stripe_onboarding_complete) {
      return res.status(400).json({ 
        error: 'Event host has not set up payment processing',
        host_setup_required: true
      });
    }

    // Check if user already registered
    const { data: existingRsvp } = await supabase
      .from('rsvps')
      .select('id, payment_status')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingRsvp && existingRsvp.payment_status === 'paid') {
      return res.status(400).json({ error: 'User already registered and paid' });
    }

    // Calculate fees
    const registrationFee = parseFloat(event.cost); // in dollars
    const platformFee = registrationFee * PLATFORM_FEE_PERCENT;
    const hostPayout = registrationFee - platformFee;

    // Convert to cents for Stripe
    const amountInCents = Math.round(registrationFee * 100);
    const applicationFeeAmount = Math.round(platformFee * 100);

    // Fetch user details for checkout
    const { data: user } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: event.currency || 'usd',
          product_data: {
            name: `Registration: ${event.title}`,
            description: event.description || '',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/view-event/${eventId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/view-event/${eventId}?payment=cancelled`,
      customer_email: user.email,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        on_behalf_of: host.stripe_account_id,
        transfer_data: {
          destination: host.stripe_account_id,
        },
      },
      metadata: {
        event_id: eventId,
        user_id: userId,
        registration_fee: registrationFee.toString(),
        platform_fee: platformFee.toString(),
        host_payout: hostPayout.toString(),
      },
    });

    // Create or update RSVP with pending status
    const rsvpData = {
      user_id: userId,
      event_id: eventId,
      status: 'going',
      payment_status: 'pending',
      stripe_checkout_session_id: session.id,
      payment_amount: registrationFee,
      platform_fee_amount: platformFee,
      host_payout_amount: hostPayout,
    };

    if (existingRsvp) {
      await supabase
        .from('rsvps')
        .update(rsvpData)
        .eq('id', existingRsvp.id);
    } else {
      await supabase
        .from('rsvps')
        .insert([rsvpData]);
    }

    return res.status(200).json({ 
      session_id: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

### 4. Stripe Webhook Handler

**File**: `pages/api/stripe/webhook.js`

```javascript
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Update RSVP payment status
        const { data: rsvp } = await supabase
          .from('rsvps')
          .select('id, stripe_payment_intent_id')
          .eq('stripe_checkout_session_id', session.id)
          .single();

        if (rsvp) {
          await supabase
            .from('rsvps')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rsvp.id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update RSVP with payment intent ID if not already set
        const { data: rsvp } = await supabase
          .from('rsvps')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (!rsvp) {
          // Try to find by metadata
          const { data: rsvps } = await supabase
            .from('rsvps')
            .select('id')
            .eq('user_id', paymentIntent.metadata.user_id)
            .eq('event_id', paymentIntent.metadata.event_id)
            .eq('payment_status', 'pending')
            .limit(1);

          if (rsvps && rsvps.length > 0) {
            await supabase
              .from('rsvps')
              .update({
                payment_status: 'paid',
                stripe_payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rsvps[0].id);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        await supabase
          .from('rsvps')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;

        await supabase
          .from('rsvps')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

## Frontend Changes

### 1. Update Create Event Form

**File**: `pages/create-event/CreateEvent.js`

Add fee input field:

```javascript
// Add to formData state
const [formData, setFormData] = useState({
  // ... existing fields
  cost: '',
  payment_required: false,
})

// Add fee input in form JSX
<div className={styles.formGroup}>
  <label className={styles.fieldLabel}>Registration Fee (Optional)</label>
  <div className={styles.paymentRow}>
    <label className={styles.toggleLabel}>
      <input
        type="checkbox"
        checked={formData.payment_required}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          payment_required: e.target.checked,
          cost: e.target.checked ? prev.cost : ''
        }))}
        className={styles.toggleSwitch}
      />
      <span>Require payment to register</span>
    </label>
    {formData.payment_required && (
      <input
        type="number"
        name="cost"
        value={formData.cost}
        onChange={handleInputChange}
        placeholder="0.00"
        min="0"
        step="0.01"
        className={styles.input}
      />
    )}
  </div>
</div>

// Update submit handler
const eventData = {
  // ... existing fields
  cost: formData.payment_required ? parseFloat(formData.cost) : null,
  payment_required: formData.payment_required,
  currency: 'usd',
}
```

### 2. Update Manage Registration Component

**File**: `pages/manage-event/ManageRegistration.js`

Add Stripe Connect account status check and linking:

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function ManageRegistration() {
  const { user } = useAuth();
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(true);

  useEffect(() => {
    checkStripeStatus();
  }, [user]);

  const checkStripeStatus = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/stripe/connect/status?userId=${user.id}`);
      const data = await response.json();
      
      setStripeConnected(data.connected);
      setStripeOnboardingComplete(data.onboarding_complete);
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setCheckingStripeStatus(false);
    }
  };

  const connectStripeAccount = async () => {
    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
    }
  };

  // In JSX, show Stripe connection status
  {!stripeOnboardingComplete && (
    <div className={styles.stripeSection}>
      <h3 className={styles.sectionTitle}>Payment Processing</h3>
      <p>Connect your Stripe account to collect registration fees.</p>
      <button onClick={connectStripeAccount} className={styles.connectButton}>
        {stripeConnected ? 'Complete Stripe Setup' : 'Connect Stripe Account'}
      </button>
    </div>
  )}

  {stripeOnboardingComplete && (
    <div className={styles.costSection}>
      {/* Existing cost input */}
    </div>
  )}
}
```

### 3. Update Event Detail Page (Registration Flow)

**File**: `pages/view-event/[id].js`

Update RSVP handler to redirect to Stripe Checkout if payment required:

```javascript
const handleRSVP = async () => {
  if (!user) {
    router.push('/login')
    return
  }
  if (isAlreadyRegistered) return

  // Check if payment is required
  if (event.payment_required && event.cost > 0) {
    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        setError('Failed to create payment session');
      }
    } catch (error) {
      setError('Error processing payment');
    }
  } else {
    // Free event - create RSVP directly
    await createRSVP()
  }
}

// Add payment success/cancel handling
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    // Refresh event data to update registration status
    fetchEvent();
    checkRegistrationStatus();
  }
}, []);
```

### 4. Display Registration Fee on Event Page

**File**: `pages/view-event/[id].js`

```javascript
// Add fee display in RSVP card
{event.payment_required && event.cost > 0 && (
  <div className={styles.registrationFee}>
    <span className={styles.feeLabel}>Registration Fee:</span>
    <span className={styles.feeAmount}>
      ${parseFloat(event.cost).toFixed(2)}
    </span>
  </div>
)}
```

## Supabase RLS Policy Updates

### Update `rsvps` policies to allow Stripe webhook updates

The service role should already have access, but ensure webhooks can update payment status:

```sql
-- Service role already has access via existing policy
-- Ensure webhook service can update payment fields
-- (Service role policies should cover this)
```

## Stripe Dashboard Configuration

### 1. Webhook Endpoints

Configure webhook endpoint in Stripe Dashboard:
- **URL**: `https://yourdomain.com/api/stripe/webhook`
- **Events to listen for**:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated` (for Connect account status)

### 2. Connect Settings

- Enable Stripe Connect in Dashboard
- Set application fee percentage: 6%
- Configure Express account requirements
- Set up payout schedules for connected accounts

## Testing

### Test Mode Setup

1. Use Stripe test keys: `sk_test_...` and `pk_test_...`
2. Create test Express accounts for hosts
3. Use test cards from Stripe documentation
4. Test payment flow end-to-end
5. Verify webhook events in Stripe Dashboard

### Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Use any future expiry date and any CVC

## Implementation Checklist

- [ ] Install Stripe npm package: `npm install stripe`
- [ ] Add environment variables to `.env.local` and Supabase
- [ ] Run database migrations for schema changes
- [ ] Create Stripe Connect API routes
- [ ] Create Checkout Session API route
- [ ] Create Webhook handler API route
- [ ] Update CreateEvent component with fee input
- [ ] Update ManageRegistration with Stripe Connect UI
- [ ] Update EventDetail page with payment flow
- [ ] Configure Stripe webhooks in Dashboard
- [ ] Test end-to-end payment flow
- [ ] Test Connect account onboarding
- [ ] Test webhook handling
- [ ] Verify 6% platform fee calculation
- [ ] Add error handling and user feedback
- [ ] Add loading states for async operations

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **RLS Policies**: Ensure proper Row Level Security on all tables
3. **API Authentication**: Verify user authentication in API routes
4. **Input Validation**: Validate all user inputs and amounts
5. **Error Handling**: Don't expose sensitive Stripe errors to clients
6. **HTTPS**: Always use HTTPS in production

## Platform Fee Calculation

The 6% platform fee is calculated as follows:

```javascript
const registrationFee = 25.00; // $25 registration fee
const platformFee = registrationFee * 0.06; // $1.50 (6%)
const hostPayout = registrationFee - platformFee; // $23.50
```

Stripe handles the fee split automatically when using `application_fee_amount` in the payment intent.

## Support & Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check webhook URL and secret
2. **Payment fails**: Verify connected account is fully onboarded
3. **RSVP status not updating**: Check webhook handler logs
4. **Connect account linking fails**: Verify redirect URLs are correct

### Logging

Add comprehensive logging to all API routes for debugging:
- Payment intent creation
- Checkout session creation
- Webhook events received
- Database updates

