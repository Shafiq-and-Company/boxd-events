# Tournaments Table Row Level Security Policies

## Table Schema

The `tournaments` table stores information about gaming tournaments linked to events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `event_id` | uuid | NO | null | Foreign key to events table |
| `max_participants` | integer | NO | 16 | Maximum number of participants |
| `status` | text | NO | 'registration'::text | Tournament status (registration, seeding, active, completed, cancelled) |
| `tournament_type` | text | NO | 'single_elimination'::text | Tournament format (single_elimination, double_elimination, round_robin, swiss) |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `updated_at` | timestamp with time zone | YES | now() | Record update time |
| `created_by` | uuid | NO | null | Tournament creator user ID (foreign key to users) |
| `rules` | text | YES | null | Tournament rules and regulations |
| `bracket_data` | jsonb | YES | null | Complete bracket state stored as JSON |

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
```

### Policy 1: Public Read Access for Active Tournaments
```sql
-- Allow anyone to view active tournaments
CREATE POLICY "Public can view active tournaments" ON tournaments
    FOR SELECT
    USING (status IN ('registration', 'seeding', 'active', 'completed'));
```
**Purpose**: Enables public tournament discovery and viewing

### Policy 2: Tournament Creators Can Manage Their Tournaments
```sql
-- Allow tournament creators to manage their own tournaments
CREATE POLICY "Creators can manage their tournaments" ON tournaments
    FOR ALL
    TO authenticated
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);
```
**Purpose**: Tournament creators have full control over their tournaments

### Policy 3: Event Hosts Can Manage Tournaments for Their Events
```sql
-- Allow event hosts to manage tournaments for their events
CREATE POLICY "Event hosts can manage tournaments" ON tournaments
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = tournaments.event_id 
            AND events.host_id = auth.uid()
        )
    );
```
**Purpose**: Event hosts can manage tournaments within their events

### Policy 4: Service Role Access
```sql
-- Allow service role to manage all tournaments (for admin operations)
CREATE POLICY "Service role can manage all tournaments" ON tournaments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables system operations and administrative access

## Implementation Notes

### Security Model
- **Public Read**: Anyone can view active tournaments
- **Creator Management**: Tournament creators can manage their own tournaments
- **Event Host Management**: Event hosts can manage tournaments within their events
- **Authentication Required**: All write operations require authentication
- **Creator ID Validation**: Ensures users can only create tournaments where they are the creator

### Key Operations
- **Read**: Public access for active tournaments + Creator/Host access to own tournaments
- **Create**: Authenticated users only (must be creator)
- **Update**: Creator/Host-only access to own tournaments
- **Delete**: Creator/Host-only access to own tournaments
- **System**: Service role for administrative operations

### Policy Enforcement
- **INSERT**: Users can only create tournaments where `auth.uid() = created_by`
- **SELECT**: Public read for active tournaments + Creator/Host read of own tournaments
- **UPDATE**: Creators/Hosts can only update tournaments they own
- **DELETE**: Creators/Hosts can only delete tournaments they own

### Tournament Types Supported
- **Single Elimination**: Traditional knockout tournament
- **Double Elimination**: Players must lose twice to be eliminated
- **Round Robin**: Everyone plays everyone else
- **Swiss**: Pairing-based tournament with standings

### JSON Bracket Data Structure
The `bracket_data` column stores complete tournament state as JSON:
```json
{
  "rounds": [
    {
      "roundNumber": 1,
      "matches": [
        {
          "matchId": "round1_match1",
          "player1": { "id": "uuid", "name": "Player 1", "seed": 1 },
          "player2": { "id": "uuid", "name": "Player 2", "seed": 2 },
          "player1Score": 2,
          "player2Score": 1,
          "winner": "uuid",
          "status": "completed"
        }
      ]
    }
  ],
  "participants": [
    { "id": "uuid", "name": "Player 1", "seed": 1, "eliminated": false }
  ],
  "currentRound": 1,
  "totalRounds": 4
}
```

### Security Benefits
- Prevents users from creating tournaments with incorrect creator_id
- Ensures creators can manage their tournaments even if public access is restricted
- Maintains data integrity by enforcing creator ownership
- Allows for future admin features while maintaining security
- Supports multiple tournament formats with flexible JSON storage

### Database Relationships
- **Events Table**: `event_id` field references `events.id`
- **Users Table**: `created_by` field references `users.id`
- **Tournament Matches Table**: One-to-many relationship with `tournament_matches`
- **RSVPs Table**: Tournament participants derived from `rsvps` where `event_id` matches
