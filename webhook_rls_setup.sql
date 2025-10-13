-- RLS Policies for Stripe Webhook Integration
-- Run this SQL in your Supabase Dashboard > SQL Editor

-- Drop existing webhook policies if they exist
DROP POLICY IF EXISTS "Allow webhook RSVP creation" ON rsvps;
DROP POLICY IF EXISTS "Allow webhook RSVP updates" ON rsvps;
DROP POLICY IF EXISTS "Service role can manage all RSVPs" ON rsvps;

-- Policy 5: Allow webhook operations to create RSVPs for paid events
-- This policy allows RSVP creation when payment_status is 'paid' and stripe_session_id exists
CREATE POLICY "Allow webhook RSVP creation" ON rsvps
    FOR INSERT
    TO authenticated
    WITH CHECK (
        payment_status = 'paid' AND
        stripe_session_id IS NOT NULL AND
        user_id IS NOT NULL AND
        event_id IS NOT NULL
    );

-- Policy 6: Allow webhook operations to update RSVPs
-- This policy allows payment status updates from webhooks
CREATE POLICY "Allow webhook RSVP updates" ON rsvps
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (
        payment_status IN ('paid', 'pending', 'failed', 'refunded')
    );

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'rsvps' 
ORDER BY policyname;
