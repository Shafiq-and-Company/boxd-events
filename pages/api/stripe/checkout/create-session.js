import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '0.06');

// Helper to get environment variables
const getEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

// Helper to verify user authentication
const verifyUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split('Bearer ')[1];
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user: userData.user, error: null };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user authentication
    const { user, error: authError } = await verifyUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const { eventId, userId } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ error: 'Event ID and User ID required' });
    }

    // Verify the userId matches the authenticated user (security check)
    if (userId !== user.id) {
      return res.status(403).json({ error: 'User ID does not match authenticated user' });
    }

    // Get Supabase client with service role for database operations
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch event details with host's Stripe account info
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        host_user:host_id (
          id,
          stripe_account_id,
          stripe_onboarding_complete
        )
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Error fetching event:', eventError);
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if payment is required
    if (!event.payment_required || !event.cost || event.cost <= 0) {
      return res.status(400).json({ error: 'Event does not require payment' });
    }

    // Check if host has Stripe account
    const host = event.host_user;
    if (!host || !host.stripe_account_id || !host.stripe_onboarding_complete) {
      return res.status(400).json({
        error: 'Event host has not set up payment processing',
        host_setup_required: true,
      });
    }

    // Check if user already registered and paid
    const { data: existingRsvp, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, payment_status')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (rsvpError && rsvpError.code !== 'PGRST116') {
      console.error('Error checking existing RSVP:', rsvpError);
      return res.status(500).json({ error: 'Failed to check registration status' });
    }

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

    // Validate amounts
    if (amountInCents < 50) {
      return res.status(400).json({ error: 'Registration fee must be at least $0.50' });
    }

    // Fetch user details for checkout
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    // Get app URL from environment
    const appUrl = getEnv('NEXT_PUBLIC_APP_URL');

    // Create Checkout Session with Stripe Connect
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: event.currency || 'usd',
            product_data: {
              name: `Registration: ${event.title}`,
              description: event.description || '',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/view-event/${eventId}?payment=success`,
      cancel_url: `${appUrl}/view-event/${eventId}?payment=cancelled`,
      customer_email: userData.email,
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
      const { error: updateError } = await supabase
        .from('rsvps')
        .update(rsvpData)
        .eq('id', existingRsvp.id);

      if (updateError) {
        console.error('Error updating RSVP:', updateError);
        // Continue even if update fails - the checkout session is created
      }
    } else {
      const { error: insertError } = await supabase.from('rsvps').insert([rsvpData]);

      if (insertError) {
        console.error('Error creating RSVP:', insertError);
        // Continue even if insert fails - the checkout session is created
      }
    }

    return res.status(200).json({
      session_id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

