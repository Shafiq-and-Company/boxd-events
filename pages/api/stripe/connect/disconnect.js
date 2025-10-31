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
  if (req.method !== 'DELETE') {
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

    // Fetch user data to get Stripe account ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If no Stripe account connected, return success
    if (!userData.stripe_account_id) {
      return res.status(200).json({
        success: true,
        message: 'No Stripe account connected',
      });
    }

    // Clear Stripe account connection from database
    // Note: We don't delete the Stripe account itself, just the connection
    // This allows the user to reconnect later if needed
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: null,
        stripe_onboarding_complete: false,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error disconnecting Stripe account:', updateError);
      return res.status(500).json({ error: 'Failed to disconnect Stripe account' });
    }

    console.log(`Stripe account disconnected for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Stripe account disconnected successfully',
    });
  } catch (error) {
    console.error('Stripe disconnect error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

