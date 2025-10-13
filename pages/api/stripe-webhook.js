import Stripe from 'stripe'
import { supabase } from '../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export default async function handler(req, res) {
  console.log('Webhook received:', req.method, req.url)
  console.log('Request headers:', req.headers)
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  let event

  try {
    // For Netlify, we need to handle the raw body properly
    let body = req.body
    
    // If body is already parsed, we need to stringify it back for Stripe
    if (typeof body === 'object') {
      body = JSON.stringify(body)
    }
    
    console.log('Processing webhook with signature:', sig ? 'present' : 'missing')
    console.log('Webhook body type:', typeof body)
    console.log('Webhook body length:', body ? body.length : 0)
    
    if (!endpointSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }
    
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    console.log('Webhook event type:', event.type)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    console.error('Webhook error details:', err)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  // Handle the event
  try {
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
  } catch (error) {
    console.error('Error processing webhook event:', error)
    return res.status(500).json({ 
      error: 'Internal server error processing webhook',
      details: error.message 
    })
  }

  res.status(200).json({ received: true })
}

async function handleSuccessfulPayment(session) {
  try {
    console.log('Processing successful payment for session:', session.id)
    console.log('Session metadata:', session.metadata)
    
    const { eventId, userId } = session.metadata

    if (!eventId || !userId) {
      console.error('Missing metadata in checkout session:', session.metadata)
      console.error('Session object:', session)
      return
    }
    
    console.log('Creating/updating RSVP for user:', userId, 'event:', eventId)

    // Check if RSVP already exists to avoid duplicates
    const { data: existingRsvp, error: checkError } = await supabase
      .from('rsvps')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing RSVP:', checkError)
      throw checkError
    }

    if (existingRsvp) {
      console.log('Updating existing RSVP for user:', userId, 'event:', eventId)
      // Update existing RSVP with payment info
      const { error: updateError } = await supabase
        .from('rsvps')
        .update({
          payment_status: 'paid',
          stripe_session_id: session.id,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (updateError) {
        console.error('Error updating RSVP:', updateError)
        throw updateError
      }

      console.log('RSVP updated successfully for user:', userId, 'event:', eventId)
    } else {
      console.log('Creating new RSVP for user:', userId, 'event:', eventId)
      // Create new RSVP record in Supabase
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
        console.error('RSVP creation error details:', error)
        throw error
      }

      console.log('RSVP created successfully for user:', userId, 'event:', eventId)
    }
  } catch (error) {
    console.error('Error handling successful payment:', error)
    console.error('Payment session details:', {
      sessionId: session.id,
      metadata: session.metadata,
      error: error.message
    })
    // Don't throw - let the webhook respond with success to Stripe
    // The error is logged for debugging
  }
}
