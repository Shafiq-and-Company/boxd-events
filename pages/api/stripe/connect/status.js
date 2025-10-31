import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper to get environment variables
const getEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

// Helper to verify user authentication and create authenticated Supabase client
const verifyUserAndCreateClient = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, supabase: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split('Bearer ')[1];
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  // Create client with anon key and user's session
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify the token by getting the user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return { user: null, supabase: null, error: 'Invalid or expired token' };
  }

  return { user: userData.user, supabase, error: null };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user authentication and get authenticated Supabase client
    const { user, supabase, error: authError } = await verifyUserAndCreateClient(req);
    if (authError || !user || !supabase) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const userId = req.query.userId || user.id;

    // Verify the userId matches the authenticated user (security check)
    if (userId !== user.id) {
      return res.status(403).json({ error: 'User ID does not match authenticated user' });
    }

    // Fetch user data from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If no Stripe account ID, return not connected
    if (!userData.stripe_account_id) {
      return res.status(200).json({
        connected: false,
        onboarding_complete: false,
        account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      });
    }

    // Check account status with Stripe
    let account;
    try {
      account = await stripe.accounts.retrieve(userData.stripe_account_id);
    } catch (stripeError) {
      console.error('Error retrieving Stripe account:', stripeError);
      // If account doesn't exist in Stripe, return not connected
      if (stripeError.code === 'resource_missing') {
        return res.status(200).json({
          connected: false,
          onboarding_complete: false,
          account_id: null,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          error: 'Stripe account not found',
        });
      }
      throw stripeError;
    }

    // Determine onboarding completion status
    const isOnboardingComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Update database if status changed
    if (isOnboardingComplete !== userData.stripe_onboarding_complete) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_onboarding_complete: isOnboardingComplete })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user onboarding status:', updateError);
        // Don't fail the request, just log the error
      } else {
        console.log(`Updated onboarding status for user ${userId}: ${isOnboardingComplete}`);
      }
    }

    return res.status(200).json({
      connected: !!userData.stripe_account_id,
      onboarding_complete: isOnboardingComplete,
      account_id: userData.stripe_account_id,
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      details_submitted: account.details_submitted || false,
      requirements: account.requirements || null,
    });
  } catch (error) {
    console.error('Stripe status check error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

