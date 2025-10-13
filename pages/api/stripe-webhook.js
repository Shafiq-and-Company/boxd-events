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
        console.log('Payment completed for session:', session.id)
        console.log('User will be redirected to create RSVP client-side')
        // Don't create RSVP here - let client-side handle it with proper user context
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

