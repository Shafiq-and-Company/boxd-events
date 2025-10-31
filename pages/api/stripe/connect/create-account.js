import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

    const userId = req.body.userId || user.id;
    const eventId = req.body.eventId; // Optional: for redirect URLs

    // Verify the userId matches the authenticated user (security check)
    if (userId !== user.id) {
      return res.status(403).json({ error: 'User ID does not match authenticated user' });
    }

    // Get Supabase client with service role for database operations
    const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already has a connected account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete, email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userData.stripe_account_id && userData.stripe_onboarding_complete) {
      return res.status(400).json({
        error: 'Stripe account already connected',
        account_id: userData.stripe_account_id,
      });
    }

    // Create Express account if not exists
    let accountId = userData.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US', // TODO: Get from user profile if available
        email: userData.email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      accountId = account.id;

      // Store account ID in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_account_id: accountId })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user with Stripe account ID:', updateError);
        return res.status(500).json({ error: 'Failed to store Stripe account ID' });
      }
    }

    // Get app URL from environment
    const appUrl = getEnv('NEXT_PUBLIC_APP_URL');

    // Build redirect URLs - use event-specific URL if provided, otherwise generic
    const basePath = eventId 
      ? `/manage-event/${eventId}` 
      : '/manage-event';
    const refreshUrl = `${appUrl}${basePath}?stripe=refresh`;
    const returnUrl = `${appUrl}${basePath}?stripe=success`;

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: userData.stripe_onboarding_complete ? 'account_update' : 'account_onboarding',
    });

    return res.status(200).json({
      url: accountLink.url,
      account_id: accountId,
    });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

