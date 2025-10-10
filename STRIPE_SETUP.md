# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for the BOXD Events application.

## Prerequisites

1. Stripe account (create at https://stripe.com)
2. Supabase project with updated RSVP schema
3. Environment variables configured

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database Schema Updates

The RSVP table has been updated to include payment information:

```sql
-- Add these columns to your rsvps table
ALTER TABLE rsvps ADD COLUMN payment_status text CHECK (payment_status IN ('pending','paid','failed','refunded')) DEFAULT 'pending';
ALTER TABLE rsvps ADD COLUMN stripe_session_id text;
ALTER TABLE rsvps ADD COLUMN updated_at timestamptz DEFAULT now();
```

## Stripe Webhook Setup

1. **Create Webhook Endpoint in Stripe Dashboard:**
   - Go to Stripe Dashboard > Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://boxd-events.netlify.app/api/stripe-webhook`
   - Events to send: `checkout.session.completed`, `payment_intent.payment_failed`

2. **Get Webhook Secret:**
   - After creating the webhook, copy the "Signing secret"
   - Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## API Endpoints Created

### `/api/create-checkout-session`
- Creates Stripe checkout sessions for paid events
- Handles event metadata and user information
- Returns checkout URL for redirect

### `/api/stripe-webhook`
- Handles Stripe webhook events
- Creates RSVP records after successful payment
- Updates payment status in database

## User Flow

1. **User clicks RSVP on paid event**
2. **System creates Stripe checkout session**
3. **User completes payment on Stripe**
4. **Stripe webhook creates RSVP record**
5. **User redirected to My Events with confirmation**

## Testing

### Test Cards (Stripe Test Mode)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

### Webhook Testing
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

## Production Deployment

1. **Update environment variables** with production Stripe keys
2. **Configure webhook endpoint** in Stripe Dashboard
3. **Test payment flow** with real cards (small amounts)
4. **Monitor webhook logs** for any issues

## Troubleshooting

### Common Issues:
- **Webhook not receiving events**: Check endpoint URL and webhook secret
- **RSVP not created**: Verify webhook is processing `checkout.session.completed`
- **Payment status not updating**: Check database schema and webhook handler

### Debug Steps:
1. Check Stripe Dashboard for webhook delivery logs
2. Verify environment variables are set correctly
3. Test with Stripe CLI for local development
4. Check browser console for client-side errors

## Security Notes

- Never expose secret keys in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Implement proper error handling and logging
