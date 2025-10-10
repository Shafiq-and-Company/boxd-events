import Stripe from 'stripe'
import { supabase } from '../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { eventId, userId, amount } = req.body

    if (!eventId || !userId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get event details from Supabase
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: event.title,
              description: `Registration for ${event.title}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?rsvp=success&event=${eventId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/event/${eventId}`,
      metadata: {
        eventId: eventId,
        userId: userId,
      },
    })

    res.status(200).json({ 
      sessionId: session.id, 
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    })
  }
}
