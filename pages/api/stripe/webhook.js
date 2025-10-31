import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Supabase client with secret key for webhook operations
// Uses Secret Key (sb_secret_...) for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseSecretKey);

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
        const { data: rsvp, error: rsvpError } = await supabase
          .from('rsvps')
          .select('id, stripe_payment_intent_id')
          .eq('stripe_checkout_session_id', session.id)
          .single();

        if (rsvpError && rsvpError.code !== 'PGRST116') {
          console.error('Error fetching RSVP:', rsvpError);
        }

        if (rsvp) {
          const { error: updateError } = await supabase
            .from('rsvps')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rsvp.id);

          if (updateError) {
            console.error('Error updating RSVP:', updateError);
          } else {
            console.log(`RSVP ${rsvp.id} marked as paid via checkout.session.completed`);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        
        // Update RSVP with payment intent ID if not already set
        const { data: rsvp, error: rsvpError } = await supabase
          .from('rsvps')
          .select('id, payment_status')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (rsvpError && rsvpError.code !== 'PGRST116') {
          console.error('Error fetching RSVP:', rsvpError);
        }

        if (!rsvp) {
          // Try to find by metadata
          const { data: rsvps, error: findError } = await supabase
            .from('rsvps')
            .select('id')
            .eq('user_id', paymentIntent.metadata?.user_id)
            .eq('event_id', paymentIntent.metadata?.event_id)
            .eq('payment_status', 'pending')
            .limit(1);

          if (findError) {
            console.error('Error finding RSVP by metadata:', findError);
            break;
          }

          if (rsvps && rsvps.length > 0) {
            const { error: updateError } = await supabase
              .from('rsvps')
              .update({
                payment_status: 'paid',
                stripe_payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', rsvps[0].id);

            if (updateError) {
              console.error('Error updating RSVP:', updateError);
            } else {
              console.log(`RSVP ${rsvps[0].id} marked as paid via payment_intent.succeeded`);
            }
          }
        } else if (rsvp.payment_status !== 'paid') {
          // RSVP exists but not paid - update it
          const { error: updateError } = await supabase
            .from('rsvps')
            .update({
              payment_status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', rsvp.id);

          if (updateError) {
            console.error('Error updating RSVP:', updateError);
          } else {
            console.log(`RSVP ${rsvp.id} marked as paid via payment_intent.succeeded`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        
        const { error: updateError } = await supabase
          .from('rsvps')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntent.id);

        if (updateError) {
          console.error('Error updating RSVP to failed:', updateError);
        } else {
          console.log(`RSVP marked as failed for payment_intent ${paymentIntent.id}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;

        if (!paymentIntentId) {
          console.error('No payment_intent found in refunded charge');
          break;
        }

        const { error: updateError } = await supabase
          .from('rsvps')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);

        if (updateError) {
          console.error('Error updating RSVP to refunded:', updateError);
        } else {
          console.log(`RSVP marked as refunded for payment_intent ${paymentIntentId}`);
        }
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

