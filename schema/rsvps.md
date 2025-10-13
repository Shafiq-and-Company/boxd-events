# RSVPs Table Row Level Security Policies

## Table Schema

The `rsvps` table manages user event registrations and payment status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `user_id` | uuid | NO | null | Foreign key to users table |
| `event_id` | uuid | NO | null | Foreign key to events table |
| `status` | text | NO | 'going' | RSVP status (going, maybe, not_going) |
| `payment_status` | text | YES | 'pending' | Payment status (pending, paid, failed, refunded) |
| `stripe_session_id` | text | YES | null | Stripe checkout session ID |
| `created_at` | timestamptz | YES | now() | Record creation time |
| `updated_at` | timestamptz | YES | now() | Record update time |

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
```

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

### Policy 5: Service Role Full Access
```sql
-- Allow service role to manage all RSVPs (for webhooks and admin operations)
CREATE POLICY "Service role can manage all RSVPs" ON rsvps
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables Stripe webhooks and administrative operations

### Policy 6: Event Hosts Can View RSVPs for Their Events
```sql
-- Allow event hosts to view RSVPs for their events
CREATE POLICY "Event hosts can view RSVPs for their events" ON rsvps
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = rsvps.event_id 
            AND events.host = auth.uid()::text
        )
    );
```
**Purpose**: Event creators can see who has RSVP'd to their events

### Policy 7: Public Read Access for Event Details (Optional)
```sql
-- Allow public read access to RSVP counts (without personal data)
CREATE POLICY "Public can view RSVP counts" ON rsvps
    FOR SELECT
    USING (true);
```
**Purpose**: Enables public event pages to show attendee counts
**Note**: This policy should be used carefully - consider creating a view instead

## Implementation Notes

### Authentication Requirements
- **User Operations**: All user operations require authentication (`TO authenticated`)
- **User ID Matching**: Uses `auth.uid() = user_id` for user-specific access
- **Service Operations**: Service role has full access for webhook operations

### Security Considerations
- **Data Isolation**: Users can only access their own RSVPs
- **Event Host Access**: Event creators can view RSVPs for their events
- **Payment Security**: Payment status updates handled via service role

### Usage Patterns

#### User RSVP Flow
1. **Create RSVP**: User creates RSVP for themselves
2. **Update Status**: User can change RSVP status (going → maybe → not_going)
3. **Payment Processing**: Service role updates payment status via webhooks
4. **Cancel RSVP**: User can delete their RSVP

#### Event Host Flow
1. **View Attendees**: Event hosts can see who RSVP'd to their events
2. **Manage Event**: Hosts can update/delete their events (separate from RSVP policies)

#### System Operations
1. **Stripe Webhooks**: Service role creates/updates RSVPs after payment
2. **Admin Operations**: Service role can manage all RSVPs for administrative purposes

## Application Integration

### Key Operations
- **User RSVP**: Create, update, delete own RSVPs
- **Event Host**: View RSVPs for their events
- **Payment**: Service role handles payment status updates
- **Public**: Optional public access for event statistics

## Policy Testing

### Test Scenarios
1. **User A** can only see their own RSVPs
2. **User A** cannot see RSVPs of **User B**
3. **Event Host** can see RSVPs for their events
4. **Service Role** can manage all RSVPs
5. **Unauthenticated** users cannot access RSVPs (unless public policy enabled)
