# Stripe Implementation Guide

## Overview

This guide describes how to implement Stripe payment processing for **Locals**, the event platform. The implementation uses **Stripe Connect** with **Express accounts**, enabling **Organizers** (event hosts) to collect registration fees from **Attendees** while Locals takes a 6% platform fee on each registration.

## Platform Architecture

### Key Terms
- **Locals**: The platform (takes 6% fee on paid registrations)
- **Organizers**: Users who create and host events (event creators)
- **Attendees**: Users who register for events
- **Registration Fee**: Amount set by organizer for event registration
- **Platform Fee**: 6% of registration fee, automatically deducted by Locals

### Stripe Connect Model

- **Platform Account**: Locals' main Stripe account
- **Connected Accounts**: Express Stripe accounts for Organizers
- **Payment Flow**: Attendees pay Organizers directly via Stripe; Locals takes 6% application fee
- **Payment Split**: Registration fee - 6% platform fee = Organizer payout

## User Flows

### Organizer Flow (Event Creation & Management)

1. **Create Event** (`pages/create-event/CreateEvent.js`)
   - Organizer creates event with basic details (title, description, dates, location)
   - Event can be created as **free** (no payment) or **paid** (requires Stripe)
   - If paid: Organizer must link Stripe account before setting registration fee

2. **Link Stripe Account** (`pages/manage-event/ManageRegistration.js`)
   - Organizer navigates to event's "Registration" tab
   - If Stripe account not linked:
     - Click "Connect Stripe Account" button
     - Redirected to Stripe Connect onboarding (create Express account or link existing)
     - After onboarding, returned to registration settings
   - Once linked: Organizer can set registration fee for event

3. **Set Registration Fee**
   - In Registration tab, Organizer enters registration fee amount
   - Fee stored in `events.cost` (as numeric value in dollars)
   - Event marked as `payment_required = true`
   - Fee applies to all future registrations

### Attendee Flow (Event Registration)

1. **View Event** (`pages/view-event/[id].js`)
   - Attendee views event details
   - If event has registration fee: Fee displayed in Registration card
   - Registration button shows "One-Click RSVP" (free) or amount + "Register" (paid)

2. **Register for Free Event**
   - Click "One-Click RSVP"
   - RSVP created immediately with `payment_status = 'paid'`
   - No payment processing required

3. **Register for Paid Event**
   - Click "Register" button with fee amount
   - System creates Stripe Checkout session
   - Attendee redirected to Stripe Checkout page
   - Attendee enters payment information
   - Payment processed via Organizer's connected Stripe account
   - Locals automatically deducts 6% platform fee
   - After successful payment:
     - Webhook updates RSVP `payment_status = 'paid'`
     - Attendee redirected back to event page
     - Registration confirmed

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

**Current State**: `cost` column is `text` type, stores "free" or numeric values as strings.

```sql
-- Change cost from text to numeric (store registration fee in dollars)
ALTER TABLE events
ALTER COLUMN cost TYPE NUMERIC(10,2) USING 
  CASE 
    WHEN cost = 'free' OR cost IS NULL THEN NULL
    WHEN cost ~ '^[0-9]+\.?[0-9]*$' THEN cost::NUMERIC
    ELSE NULL
  END;

-- Add currency field (default USD)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- Add payment enabled flag
ALTER TABLE events
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT FALSE;

-- Set payment_required based on existing cost values
UPDATE events 
SET payment_required = TRUE 
WHERE cost IS NOT NULL AND cost > 0;

-- Add index for payment queries
CREATE INDEX IF NOT EXISTS idx_events_payment_required 
ON events(payment_required) 
WHERE payment_required = TRUE;

COMMENT ON COLUMN events.cost IS 'Registration fee in dollars (NULL for free events)';
COMMENT ON COLUMN events.currency IS 'Currency code (e.g., usd)';
COMMENT ON COLUMN events.payment_required IS 'Whether payment is required to register (TRUE if cost > 0)';
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

COMMENT ON COLUMN rsvps.stripe_payment_intent_id IS 'Stripe Payment Intent ID for tracking payments';
COMMENT ON COLUMN rsvps.stripe_checkout_session_id IS 'Stripe Checkout Session ID';
COMMENT ON COLUMN rsvps.payment_amount IS 'Total payment amount paid by attendee (in dollars)';
COMMENT ON COLUMN rsvps.platform_fee_amount IS 'Platform fee amount deducted by Locals (6% of registration fee in dollars)';
COMMENT ON COLUMN rsvps.host_payout_amount IS 'Organizer payout amount after platform fee (in dollars)';
```

**Note**: The `rsvps` table already has `payment_status` field with CHECK constraint allowing: 'pending', 'paid', 'failed', 'refunded'. This is used to track payment state throughout the registration flow.

### 4. Update Supabase RLS Policies

**Important**: Ensure service role can update RSVP payment fields via webhooks:

```sql
-- Verify service role policy exists for rsvps table
-- Service role should already have access via existing policies
-- If not, add policy to allow service role to update payment fields:
CREATE POLICY IF NOT EXISTS "Service role can update payment status" ON rsvps
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Note**: The `rsvps` table already has RLS policies for:
- Users can view their own RSVPs
- Users can create/update/delete their own RSVPs  
- Event hosts can view RSVPs for their events
- Service role should have full access (verify this exists)

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
import { supabase } from '../../../lib/supabaseClient';

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
import { supabase } from '../../../lib/supabaseClient';

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
import { supabase } from '../../../lib/supabaseClient';

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
import { supabase } from '../../../lib/supabaseClient';

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

## Frontend Implementation

### 1. Update Create Event Form

**File**: `pages/create-event/CreateEvent.js`

**Current State**: Form allows creating events but doesn't include payment/fee fields.

**Changes Needed**:

```javascript
// Add to formData state (around line 21)
const [formData, setFormData] = useState({
  title: '',
  description: '',
  location: '',
  starts_at: getTodayDateTime(),
  ends_at: getTodayDateTime(),
  city: '',
  state: '',
  zip_code: '',
  game_id: '',
  cost: '',           // NEW: Registration fee
  payment_required: false  // NEW: Payment toggle
})

// Add fee input section after game selection (around line 388)
<div className={styles.paymentSection}>
  <label className={styles.fieldLabel}>Registration</label>
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
      <span className={styles.toggleSlider}></span>
    </label>
    <span>Require payment to register</span>
  </div>
  {formData.payment_required && (
    <div className={styles.formGroup}>
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
    </div>
  )}
  {formData.payment_required && (
    <p className={styles.feeNote}>
      Note: You'll need to connect your Stripe account in event settings to collect payments. Locals takes a 6% platform fee.
    </p>
  )}
</div>

// Update submit handler (around line 171)
const eventData = {
  title: formData.title,
  description: formData.description,
  location: formData.location,
  starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
  ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
  city: formData.city,
  state: formData.state,
  zip_code: formData.zip_code,
  host_id: user.id,
  banner_image_url: bannerImageUrl,
  game_id: gameSelectionEnabled && formData.game_id ? formData.game_id : null,
  theme: currentTheme,
  cost: formData.payment_required && formData.cost ? parseFloat(formData.cost) : null,  // NEW
  payment_required: formData.payment_required,  // NEW
  currency: 'usd'  // NEW
}
```

### 2. Update Manage Registration Component

**File**: `pages/manage-event/ManageRegistration.js`

**Current State**: Component fetches and updates `events.cost` field. Needs Stripe Connect integration.

**Changes Needed**:

```javascript
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import styles from './ManageRegistration.module.css'

export default function ManageRegistration() {
  const { user } = useAuth()
  const router = useRouter()
  const { id } = router.query
  
  const [cost, setCost] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // NEW: Stripe Connect state
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false)
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false)
  const [event, setEvent] = useState(null)

  // Update fetchCost to also get payment_required status
  const fetchCost = useCallback(async () => {
    if (!id || !user) return
    
    try {
      setFetchLoading(true)
      setError(null)

      const { data: eventData, error } = await supabase
        .from('events')
        .select('cost, payment_required')
        .eq('id', id)
        .eq('host_id', user.id)
        .single()

      if (error) throw error
      if (!eventData) throw new Error('Event not found or you do not have permission to edit it')

      setEvent(eventData)
      setCost(eventData.cost || '')
      
      // Check Stripe status if payment is required
      if (eventData.payment_required) {
        await checkStripeStatus()
      }
    } catch (err) {
      console.error('Error fetching cost:', err)
      setError(err.message)
    } finally {
      setFetchLoading(false)
    }
  }, [id, user])

  // NEW: Check Stripe account status
  const checkStripeStatus = async () => {
    if (!user) return
    
    try {
      setCheckingStripeStatus(true)
      const response = await fetch(`/api/stripe/connect/status?userId=${user.id}`)
      const data = await response.json()
      
      setStripeConnected(data.connected)
      setStripeOnboardingComplete(data.onboarding_complete)
    } catch (error) {
      console.error('Error checking Stripe status:', error)
    } finally {
      setCheckingStripeStatus(false)
    }
  }

  // NEW: Connect Stripe account
  const connectStripeAccount = async () => {
    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        setError(data.error)
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      setError('Failed to connect Stripe account')
    }
  }

  // Update handleUpdateCost to also set payment_required
  const handleUpdateCost = async () => {
    if (!user) {
      setError('You must be logged in to edit an event')
      return
    }

    const costValue = parseFloat(cost)
    const paymentRequired = costValue > 0

    // If setting payment, ensure Stripe is connected
    if (paymentRequired && !stripeOnboardingComplete) {
      setError('Please connect your Stripe account before setting a registration fee')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('events')
        .update({ 
          cost: costValue || null,
          payment_required: paymentRequired
        })
        .eq('id', id)
        .eq('host_id', user.id)
        .select()

      if (error) throw error
      if (!data || data.length === 0) {
        setError('No rows were updated. You may not have permission to edit this event.')
        return
      }

      setEvent(data[0])
      // ... existing notification code ...
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // In JSX (around line 113), add Stripe section:
  return (
    <div className={styles.manageRegistration}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.registrationTabContent}>
        {/* NEW: Stripe Connection Section */}
        {event?.payment_required && !stripeOnboardingComplete && (
          <div className={styles.stripeSection}>
            <h3 className={styles.sectionTitle}>Payment Processing</h3>
            <p>Connect your Stripe account to collect registration fees. Locals takes a 6% platform fee on each registration.</p>
            <button 
              onClick={connectStripeAccount} 
              className={styles.connectButton}
              disabled={checkingStripeStatus}
            >
              {checkingStripeStatus 
                ? 'Checking...' 
                : stripeConnected 
                ? 'Complete Stripe Setup' 
                : 'Connect Stripe Account'}
            </button>
          </div>
        )}

        {/* Existing Cost Section */}
        <div className={styles.costSection}>
          <h3 className={styles.sectionTitle}>Registration Fee</h3>
          {!stripeOnboardingComplete && event?.payment_required && (
            <p className={styles.warningText}>
              Connect your Stripe account above before setting a registration fee.
            </p>
          )}
          <div className={styles.costInputRow}>
            <div className={styles.formGroup}>
              <input
                type="number"
                id="cost"
                name="cost"
                value={cost}
                onChange={handleCostChange}
                className={styles.input}
                placeholder="0.00"
                min="0"
                step="0.01"
                disabled={event?.payment_required && !stripeOnboardingComplete}
              />
            </div>
            <button 
              type="button"
              onClick={handleUpdateCost}
              disabled={loading || (event?.payment_required && !stripeOnboardingComplete)}
              className={styles.updateCostButton}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
          {cost > 0 && (
            <p className={styles.feeInfo}>
              Registration fee: ${parseFloat(cost).toFixed(2)} | 
              Platform fee (6%): ${(parseFloat(cost) * 0.06).toFixed(2)} | 
              You receive: ${(parseFloat(cost) * 0.94).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 3. Update Event Detail Page (Attendee Registration Flow)

**File**: `pages/view-event/[id].js`

**Current State**: `handleRSVP()` creates RSVP immediately with `payment_status = 'paid'` for all events.

**Changes Needed**:

```javascript
// Update fetchEvent to include payment fields (around line 62)
const fetchEvent = async () => {
  try {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        host_user:host_id (first_name, stripe_account_id, stripe_onboarding_complete),
        games (id, game_title, game_background_image_url)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    setEvent(data)
    // ... existing theme and game background logic ...
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

// Replace handleRSVP function (around line 189)
const handleRSVP = async () => {
  if (!user) {
    router.push('/login')
    return
  }
  if (isAlreadyRegistered) return

  // Check if payment is required
  if (event.payment_required && event.cost > 0) {
    // Verify host has Stripe account connected
    if (!event.host_user?.stripe_account_id || !event.host_user?.stripe_onboarding_complete) {
      setError('Event organizer has not set up payment processing yet')
      return
    }

    try {
      setIsProcessingRSVP(true)
      setError(null)

      // Create checkout session
      const response = await fetch('/api/stripe/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        setError('Failed to create payment session')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      setError('Error processing payment. Please try again.')
    } finally {
      setIsProcessingRSVP(false)
    }
  } else {
    // Free event - create RSVP directly (existing logic)
    await createRSVP()
  }
}

// Add payment success/cancel handling (add new useEffect)
useEffect(() => {
  if (!router.isReady) return
  
  const params = new URLSearchParams(window.location.search)
  const paymentStatus = params.get('payment')
  
  if (paymentStatus === 'success') {
    // Refresh event data to update registration status
    fetchEvent()
    checkRegistrationStatus()
    // Clean up URL
    router.replace(`/view-event/${id}`, undefined, { shallow: true })
  } else if (paymentStatus === 'cancelled') {
    setError('Payment was cancelled')
    router.replace(`/view-event/${id}`, undefined, { shallow: true })
  }
}, [router.isReady, id])
```

Add fee display in RSVP card (around line 445, inside `.rsvpCard`):

```javascript
<div className={styles.rsvpCard}>
  <div className={styles.rsvpHeader}>
    <h3>Registration</h3>
    {/* ... existing unregister button ... */}
  </div>
  <div className={styles.rsvpContent}>
    {/* NEW: Display registration fee */}
    {event.payment_required && event.cost > 0 && (
      <div className={styles.registrationFee}>
        <span className={styles.feeLabel}>Registration Fee:</span>
        <span className={styles.feeAmount}>
          ${parseFloat(event.cost).toFixed(2)}
        </span>
        <span className={styles.feeNote}>(+ Stripe processing fees)</span>
      </div>
    )}
    
    <div className={styles.welcomeMessage}>
      {/* ... existing welcome message ... */}
    </div>
    
    {/* ... existing user info and button ... */}
    
    <div className={styles.buttonContainer}>
      {!isAlreadyRegistered ? (
        <button 
          className={styles.rsvpButton}
          onClick={handleRSVP}
          disabled={isProcessingRSVP || checkingRegistration}
        >
          {isProcessingRSVP 
            ? 'Processing...' 
            : checkingRegistration 
            ? 'Checking...' 
            : event.payment_required && event.cost > 0
            ? `Register - $${parseFloat(event.cost).toFixed(2)}`
            : 'One-Click RSVP'}
        </button>
      ) : (
        {/* ... existing registered state ... */}
      )}
    </div>
  </div>
</div>
```

Add CSS (in `EventDetail.module.css`):

```css
.registrationFee {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  margin-bottom: 12px;
}

.feeLabel {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

.feeAmount {
  font-size: 1.2rem;
  color: #000;
  font-weight: 600;
}

.feeNote {
  font-size: 0.75rem;
  color: #999;
  margin-left: auto;
}
```


## Database Relationship Overview

### Current Schema State

**`users` table**:
- Tracks user profile information
- Will store `stripe_account_id` and `stripe_onboarding_complete` for Organizers

**`events` table**:
- Stores event information including `host_id` (organizer)
- `cost` field currently TEXT, needs migration to NUMERIC
- Will add `payment_required` boolean flag
- Foreign key: `host_id` → `users.id`

**`rsvps` table**:
- Tracks attendee registrations
- Composite primary key: (`user_id`, `event_id`)
- `payment_status` field with CHECK constraint: 'pending', 'paid', 'failed', 'refunded'
- Foreign keys: `user_id` → `users.id`, `event_id` → `events.id`
- Will add Stripe payment tracking fields

### Data Flow

1. **Organizer creates event** → `events` record created with `host_id`
2. **Organizer links Stripe** → `users.stripe_account_id` and `stripe_onboarding_complete` updated
3. **Organizer sets fee** → `events.cost` and `payment_required` updated
4. **Attendee registers** → `rsvps` record created with `payment_status = 'pending'`
5. **Payment processed** → Stripe webhook updates `rsvps.payment_status = 'paid'`

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

Locals takes 6% of each registration fee. The calculation is straightforward:

```javascript
const registrationFee = 25.00;        // $25 registration fee set by Organizer
const platformFee = registrationFee * 0.06;  // $1.50 (6% to Locals)
const organizerPayout = registrationFee - platformFee;  // $23.50 (Organizer receives)
```

**Stripe Implementation**: The fee split is handled automatically by Stripe Connect when using `application_fee_amount` in the payment intent. Attendees pay the full registration fee, and the split happens automatically:
- Locals receives: 6% application fee
- Organizer receives: 94% (after platform fee)

**Note**: Stripe charges its own processing fees (typically 2.9% + $0.30 per transaction) on top of the registration fee. These are deducted from the Organizer's payout, not from the platform fee.

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

## Summary

This implementation provides a complete Stripe Connect payment flow for Locals:

**For Organizers:**
1. Create events (free or paid)
2. Link Stripe Express account (one-time setup)
3. Set registration fees for paid events
4. Receive 94% of registration fees (after 6% platform fee)

**For Attendees:**
1. View events with registration fees clearly displayed
2. Register for free events instantly
3. Pay registration fee + Stripe processing fees for paid events
4. Automatic confirmation after successful payment

**For Locals (Platform):**
1. Automatically collects 6% platform fee on each registration
2. Handles payment processing via Stripe Connect
3. Tracks all payments in database via webhooks
4. Provides clear fee breakdown to Organizers

**Key Implementation Points:**
- Uses Stripe Connect Express accounts for Organizers
- Application fee (6%) handled automatically by Stripe
- Payment tracking via `rsvps` table with `payment_status` field
- Webhook-based payment confirmation for reliable status updates
- Clear separation between free and paid event flows
- Proper error handling and user feedback throughout

