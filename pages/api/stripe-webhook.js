import Stripe from 'stripe'
import { supabase } from '../../lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  console.log('Webhook received:', req.method, req.url)
  console.log('Request headers:', req.headers)
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  
  if (!endpointSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  // Get raw body from request
  let body = ''
  req.on('data', (chunk) => {
    body += chunk.toString()
  })
  
  req.on('end', async () => {
    try {
      console.log('Processing webhook with signature:', sig ? 'present' : 'missing')
      console.log('Webhook body length:', body.length)
      console.log('Webhook body preview:', body.substring(0, 100) + '...')
      
      const event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      console.log('Webhook event type:', event.type)
      
      // Handle the event
      await handleWebhookEvent(event, res)
    } catch (err) {
      console.error('Webhook processing failed:', err.message)
      console.error('Webhook error details:', err)
      console.error('Signature:', sig)
      console.error('Body preview:', body.substring(0, 200))
      return res.status(400).json({ error: `Webhook Error: ${err.message}` })
    }
  })
}

async function handleWebhookEvent(event, res) {
  try {
    console.log(`Processing webhook event: ${event.type}`)
    
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Handling checkout.session.completed')
        const session = event.data.object
        await handleSuccessfulPayment(session)
        break
      case 'payment_intent.succeeded':
        console.log('Payment intent succeeded:', event.data.object.id)
        break
      case 'charge.succeeded':
        console.log('Charge succeeded:', event.data.object.id)
        break
      case 'payment_intent.created':
        console.log('Payment intent created:', event.data.object.id)
        break
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
    
    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing webhook event:', error)
    console.error('Event details:', {
      type: event.type,
      id: event.id,
      error: error.message
    })
    return res.status(500).json({ 
      error: 'Internal server error processing webhook',
      details: error.message 
    })
  }
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
    
    // Additional security validation for webhook operations
    if (!userId || !eventId || !session.id) {
      console.error('Invalid webhook data - missing required fields')
      return
    }
    
    // Validate that this is a legitimate Stripe session
    if (!session.id.startsWith('cs_')) {
      console.error('Invalid Stripe session ID format')
      return
    }

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
