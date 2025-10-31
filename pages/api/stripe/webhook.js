import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is not set');
}
if (!process.env.SUPABASE_SECRET_KEY) {
  console.error('SUPABASE_SECRET_KEY is not set');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Create Supabase client with secret key for webhook operations
// Uses Secret Key (sb_secret_...) for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabase = supabaseUrl && supabaseSecretKey 
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!stripe) {
    console.error('Stripe is not initialized - STRIPE_SECRET_KEY missing');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  if (!supabase) {
    console.error('Supabase is not initialized - SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_URL missing');
    return res.status(500).json({ error: 'Database not configured' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
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
    console.log(`Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log(`Checkout session completed: ${session.id}, payment_intent: ${session.payment_intent}`);
        
        // Update RSVP payment status
        // rsvps table has composite primary key (user_id, event_id) - no id column
        const { data: rsvp, error: rsvpError } = await supabase
          .from('rsvps')
          .select('user_id, event_id, stripe_payment_intent_id, payment_status')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle();

        if (rsvpError) {
          console.error('Error fetching RSVP by checkout_session_id:', rsvpError);
        }

        if (rsvp) {
          console.log(`Found RSVP: user=${rsvp.user_id}, event=${rsvp.event_id}, current_status=${rsvp.payment_status}`);
          
          const { error: updateError } = await supabase
            .from('rsvps')
            .update({
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', rsvp.user_id)
            .eq('event_id', rsvp.event_id);

          if (updateError) {
            console.error('Error updating RSVP:', updateError);
          } else {
            console.log(`✅ RSVP (user: ${rsvp.user_id}, event: ${rsvp.event_id}) marked as paid via checkout.session.completed`);
          }
        } else {
          // RSVP not found by checkout_session_id - try to find by metadata
          console.log(`RSVP not found by checkout_session_id, trying metadata: event_id=${session.metadata?.event_id}, user_id=${session.metadata?.user_id}`);
          
          if (session.metadata?.event_id && session.metadata?.user_id) {
            const { data: rsvps, error: findError } = await supabase
              .from('rsvps')
              .select('user_id, event_id, payment_status')
              .eq('user_id', session.metadata.user_id)
              .eq('event_id', session.metadata.event_id)
              .eq('payment_status', 'pending')
              .limit(1);

            if (findError) {
              console.error('Error finding RSVP by metadata:', findError);
            } else if (rsvps && rsvps.length > 0) {
              const rsvpToUpdate = rsvps[0];
              console.log(`Found RSVP by metadata: user=${rsvpToUpdate.user_id}, event=${rsvpToUpdate.event_id}`);
              
              const { error: updateError } = await supabase
                .from('rsvps')
                .update({
                  payment_status: 'paid',
                  stripe_checkout_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', rsvpToUpdate.user_id)
                .eq('event_id', rsvpToUpdate.event_id);

              if (updateError) {
                console.error('Error updating RSVP by metadata:', updateError);
              } else {
                console.log(`✅ RSVP (user: ${rsvpToUpdate.user_id}, event: ${rsvpToUpdate.event_id}) marked as paid via checkout.session.completed (found by metadata)`);
              }
            } else {
              console.warn(`⚠️ No RSVP found for checkout session ${session.id} (event_id: ${session.metadata?.event_id}, user_id: ${session.metadata?.user_id})`);
            }
          } else {
            console.warn(`⚠️ Checkout session ${session.id} missing metadata (event_id or user_id)`);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`Payment intent succeeded: ${paymentIntent.id}`);
        console.log(`Payment intent metadata:`, paymentIntent.metadata);
        
        // Update RSVP with payment intent ID if not already set
        // rsvps table has composite primary key (user_id, event_id) - no id column
        const { data: rsvp, error: rsvpError } = await supabase
          .from('rsvps')
          .select('user_id, event_id, payment_status')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (rsvpError) {
          console.error('Error fetching RSVP by payment_intent_id:', rsvpError);
        }

        if (!rsvp) {
          // Try to find by metadata
          console.log(`RSVP not found by payment_intent_id, trying metadata: event_id=${paymentIntent.metadata?.event_id}, user_id=${paymentIntent.metadata?.user_id}`);
          
          if (!paymentIntent.metadata?.user_id || !paymentIntent.metadata?.event_id) {
            console.warn(`⚠️ Payment intent ${paymentIntent.id} missing metadata (event_id or user_id)`);
            break;
          }

          const { data: rsvps, error: findError } = await supabase
            .from('rsvps')
            .select('user_id, event_id, payment_status')
            .eq('user_id', paymentIntent.metadata.user_id)
            .eq('event_id', paymentIntent.metadata.event_id)
            .eq('payment_status', 'pending')
            .limit(1);

          if (findError) {
            console.error('Error finding RSVP by metadata:', findError);
            break;
          }

          if (rsvps && rsvps.length > 0) {
            const rsvpToUpdate = rsvps[0];
            console.log(`Found RSVP by metadata: user=${rsvpToUpdate.user_id}, event=${rsvpToUpdate.event_id}, status=${rsvpToUpdate.payment_status}`);
            
            const { error: updateError } = await supabase
              .from('rsvps')
              .update({
                payment_status: 'paid',
                stripe_payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', rsvpToUpdate.user_id)
              .eq('event_id', rsvpToUpdate.event_id);

            if (updateError) {
              console.error('Error updating RSVP:', updateError);
            } else {
              console.log(`✅ RSVP (user: ${rsvpToUpdate.user_id}, event: ${rsvpToUpdate.event_id}) marked as paid via payment_intent.succeeded`);
            }
          } else {
            console.warn(`⚠️ No pending RSVP found for payment intent ${paymentIntent.id} (event_id: ${paymentIntent.metadata.event_id}, user_id: ${paymentIntent.metadata.user_id})`);
          }
        } else {
          console.log(`Found RSVP by payment_intent_id: user=${rsvp.user_id}, event=${rsvp.event_id}, current_status=${rsvp.payment_status}`);
          
          if (rsvp.payment_status !== 'paid') {
            // RSVP exists but not paid - update it
            const { error: updateError } = await supabase
              .from('rsvps')
              .update({
                payment_status: 'paid',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', rsvp.user_id)
              .eq('event_id', rsvp.event_id);

            if (updateError) {
              console.error('Error updating RSVP:', updateError);
            } else {
              console.log(`✅ RSVP (user: ${rsvp.user_id}, event: ${rsvp.event_id}) marked as paid via payment_intent.succeeded`);
            }
          } else {
            console.log(`RSVP (user: ${rsvp.user_id}, event: ${rsvp.event_id}) already marked as paid`);
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

