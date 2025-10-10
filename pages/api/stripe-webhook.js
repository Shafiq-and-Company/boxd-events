import Stripe from 'stripe'
import { supabase } from '../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      await handleSuccessfulPayment(session)
      break
    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.status(200).json({ received: true })
}

async function handleSuccessfulPayment(session) {
  try {
    const { eventId, userId } = session.metadata

    if (!eventId || !userId) {
      console.error('Missing metadata in checkout session:', session.metadata)
      return
    }

    // Create RSVP record in Supabase
    const { error } = await supabase
      .from('rsvps')
      .insert({
        user_id: userId,
        event_id: eventId,
        status: 'going',
        payment_status: 'paid',
        stripe_session_id: session.id,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating RSVP:', error)
      throw error
    }

    console.log('RSVP created successfully for user:', userId, 'event:', eventId)
  } catch (error) {
    console.error('Error handling successful payment:', error)
    throw error
  }
}
