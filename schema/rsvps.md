# RSVPs Table Row Level Security Policies

## Table Schema

The `rsvps` table manages user event registrations and payment status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `user_id` | uuid | NO | null | Foreign key to users table |
| `event_id` | uuid | NO | null | Foreign key to events table |
| `status` | text | NO | 'going'::text | RSVP status (going, maybe, not_going) - CHECK constraint enforced |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `payment_status` | text | YES | 'pending'::text | Payment status (pending, paid, failed, refunded) - CHECK constraint enforced |
| `stripe_payment_intent_id` | text | YES | null | Stripe Payment Intent ID for tracking payments |
| `stripe_checkout_session_id` | text | YES | null | Stripe Checkout Session ID for payment sessions |
| `payment_amount` | numeric(10,2) | YES | null | Registration fee amount in dollars |
| `platform_fee_amount` | numeric(10,2) | YES | null | Platform fee amount in dollars (6% of registration fee) |
| `host_payout_amount` | numeric(10,2) | YES | null | Amount organizer receives after platform fee in dollars |
| `updated_at` | timestamp with time zone | YES | now() | Record update time |

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
```

### Check Constraints
```sql
-- Status constraint: Only allows 'going', 'maybe', or 'not_going'
ALTER TABLE rsvps ADD CONSTRAINT rsvps_status_check 
CHECK (status = ANY (ARRAY['going'::text, 'maybe'::text, 'not_going'::text]));

-- Payment status constraint: Only allows 'pending', 'paid', 'failed', or 'refunded'
ALTER TABLE rsvps ADD CONSTRAINT rsvps_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]));
```

### Database Migration

The Stripe payment tracking columns were added to support payment processing:

```sql
-- Add Stripe payment intent ID
ALTER TABLE rsvps
ADD COLUMN stripe_payment_intent_id TEXT;

-- Add Stripe checkout session ID
ALTER TABLE rsvps
ADD COLUMN stripe_checkout_session_id TEXT;

-- Add payment amount (in dollars)
ALTER TABLE rsvps
ADD COLUMN payment_amount NUMERIC(10,2);

-- Add platform fee amount (in dollars)
ALTER TABLE rsvps
ADD COLUMN platform_fee_amount NUMERIC(10,2);

-- Add host payout amount (in dollars)
ALTER TABLE rsvps
ADD COLUMN host_payout_amount NUMERIC(10,2);
```

**Note**: Payment amounts are stored in dollars (not cents) for consistency with the events table `cost` field. The platform fee is 6% of the registration fee, automatically calculated and stored.

### Primary Key
- **Composite Primary Key**: (`user_id`, `event_id`) - ensures one RSVP per user per event
- **Index**: `rsvps_pkey` on (`user_id`, `event_id`)

### Foreign Keys
- `rsvps_user_id_fkey`: `user_id` references `users.id`
- `rsvps_event_id_fkey`: `event_id` references `events.id`

### Policy 1: Users Can View Their Own RSVPs
```sql
-- Allow users to view their own RSVPs
CREATE POLICY "Users can view their own RSVPs" ON rsvps
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
```
**Purpose**: Users can only see their own event registrations

### Policy 2: Users Can Create Their Own RSVPs
```sql
-- Allow users to create RSVPs for themselves
CREATE POLICY "Users can create their own RSVPs" ON rsvps
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
```
**Purpose**: Users can only RSVP for themselves, preventing unauthorized registrations

### Policy 3: Users Can Update Their Own RSVPs
```sql
-- Allow users to update their own RSVPs (change status, etc.)
CREATE POLICY "Users can update their own RSVPs" ON rsvps
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
```
**Purpose**: Users can change their RSVP status or update payment information

### Policy 4: Users Can Delete Their Own RSVPs
```sql
-- Allow users to cancel their own RSVPs
CREATE POLICY "Users can delete their own RSVPs" ON rsvps
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
```
**Purpose**: Users can cancel their event registrations


### Policy 7: Event Hosts Can View RSVPs for Their Events
```sql
-- Allow event hosts to view RSVPs for their events
CREATE POLICY "Event hosts can view RSVPs for their events" ON rsvps
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = rsvps.event_id 
            AND events.host_id = auth.uid()
        )
    );
```
**Purpose**: Event creators can see who has RSVP'd to their events

### Policy 8: Public Read Access for Event Details (Optional)
```sql
-- Allow public read access to RSVP counts (without personal data)
CREATE POLICY "Public can view RSVP counts" ON rsvps
    FOR SELECT
    USING (true);
```
**Purpose**: Enables public event pages to show attendee counts
**Note**: This policy should be used carefully - consider creating a view instead

### Policy 9: Service Role Can Update Payment Status
```sql
-- Allow service role to update payment status (for webhook handlers)
CREATE POLICY "Service role can update payment status" ON rsvps
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables Stripe webhook handlers to update payment status and payment tracking fields
**Note**: This policy is critical for Stripe payment processing flow

## Implementation Notes

### Authentication Requirements
- **User Operations**: All user operations require authentication (`TO authenticated`)
- **User ID Matching**: Uses `auth.uid() = user_id` for user-specific access
- **Service Operations**: Service role has full access for webhook operations

### Security Considerations
- **Data Isolation**: Users can only access their own RSVPs
- **Event Host Access**: Event creators can view RSVPs for their events
- **Payment Security**: Payment status updates handled via service role webhook handlers
- **Payment Tracking**: Stripe payment IDs stored for transaction tracking and reconciliation

### Usage Patterns

#### User RSVP Flow
1. **Create RSVP**: User creates RSVP for themselves
   - For free events: RSVP created immediately with `payment_status = 'paid'`
   - For paid events: RSVP created with `payment_status = 'pending'`, Checkout session initiated
2. **Payment Processing**: 
   - Checkout session created with Stripe Connect
   - Payment tracked via `stripe_checkout_session_id` and `stripe_payment_intent_id`
   - Fee amounts calculated and stored (`payment_amount`, `platform_fee_amount`, `host_payout_amount`)
   - Service role updates payment status via webhooks (`checkout.session.completed`, `payment_intent.succeeded`)
3. **Update Status**: User can change RSVP status (going → maybe → not_going)
4. **Cancel RSVP**: User can delete their RSVP

#### Event Host Flow
1. **View Attendees**: Event hosts can see who RSVP'd to their events
2. **Manage Event**: Hosts can update/delete their events (separate from RSVP policies)

#### System Operations
1. **Admin Operations**: Service role can manage all RSVPs for administrative purposes

## Application Integration

### Key Operations
- **User RSVP**: Create, update, delete own RSVPs
- **Event Host**: View RSVPs for their events
- **Public**: Optional public access for event statistics

## Policy Testing

### Test Scenarios
1. **User A** can only see their own RSVPs
2. **User A** cannot see RSVPs of **User B**
3. **Event Host** can see RSVPs for their events
4. **Service Role** can manage all RSVPs
5. **Unauthenticated** users cannot access RSVPs (unless public policy enabled)
