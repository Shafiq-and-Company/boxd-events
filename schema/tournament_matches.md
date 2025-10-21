# Tournament Matches Table Row Level Security Policies

## Table Schema

The `tournament_matches` table stores individual match information for tournaments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `tournament_id` | uuid | NO | null | Foreign key to tournaments table |
| `match_id` | text | NO | null | Frontend-generated match identifier (e.g., "round1_match1") |
| `round_number` | integer | NO | null | Round number within tournament |
| `player1_id` | uuid | YES | null | First player user ID (foreign key to users) |
| `player2_id` | uuid | YES | null | Second player user ID (foreign key to users) |
| `player1_score` | integer | YES | 0 | First player's score |
| `player2_score` | integer | YES | 0 | Second player's score |
| `winner_id` | uuid | YES | null | Winner's user ID (foreign key to users) |
| `status` | text | NO | 'scheduled'::text | Match status (scheduled, in_progress, completed, forfeit, bye) |
| `scheduled_time` | timestamp with time zone | YES | null | Scheduled match time |
| `started_at` | timestamp with time zone | YES | null | Match start time |
| `completed_at` | timestamp with time zone | YES | null | Match completion time |
| `match_data` | jsonb | YES | null | Additional match-specific data |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `updated_at` | timestamp with time zone | YES | now() | Record update time |

## Row Level Security (RLS) Policies

### Enable RLS
```sql
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
```

### Policy 1: Public Read Access for Active Tournament Matches
```sql
-- Allow anyone to view matches for active tournaments
CREATE POLICY "Public can view tournament matches" ON tournament_matches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_matches.tournament_id 
            AND tournaments.status IN ('active', 'completed')
        )
    );
```
**Purpose**: Enables public viewing of tournament matches and results

### Policy 2: Event Hosts Can Manage Matches
```sql
-- Allow event hosts to manage matches for tournaments in their events
CREATE POLICY "Event hosts can manage matches" ON tournament_matches
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            JOIN events ON tournaments.event_id = events.id
            WHERE tournaments.id = tournament_matches.tournament_id 
            AND events.host_id = auth.uid()
        )
    );
```
**Purpose**: Event hosts can manage all matches within tournaments in their events

### Policy 3: Service Role Access
```sql
-- Allow service role to manage all matches (for admin operations)
CREATE POLICY "Service role can manage all matches" ON tournament_matches
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```
**Purpose**: Enables system operations and administrative access

## Implementation Notes

### Security Model
- **Public Read**: Anyone can view matches for active/completed tournaments
- **Event Host Management**: Event hosts can manage matches for tournaments in their events
- **Authentication Required**: All write operations require authentication
- **Tournament Association**: Matches are managed through event host ownership

### Key Operations
- **Read**: Public access for active tournament matches + Event host access to their tournament matches
- **Create**: Event host-only access to matches in their tournaments
- **Update**: Event host-only access to matches in their tournaments
- **Delete**: Event host-only access to matches in their tournaments
- **System**: Service role for administrative operations

### Policy Enforcement
- **INSERT**: Users can only create matches for tournaments in events they host
- **SELECT**: Public read for active tournament matches + Event host read of their tournament matches
- **UPDATE**: Event hosts can only update matches in their tournaments
- **DELETE**: Event hosts can only delete matches in their tournaments

### Match ID Naming Convention
Frontend-generated match identifiers follow these patterns:
- **Single Elimination**: `"round1_match1"`, `"round2_match1"`, etc.
- **Double Elimination**: `"winners_round1_match1"`, `"losers_round1_match1"`, `"grand_finals_match1"`
- **Swiss Tournament**: `"round1_match1"`, `"round2_match1"`, etc.
- **Round Robin**: `"round1_match1"`, `"round1_match2"`, etc.

### Match Status Flow
1. **scheduled**: Match is created and waiting to start
2. **in_progress**: Match is currently being played
3. **completed**: Match has finished with a result
4. **forfeit**: Match was forfeited by one player
5. **bye**: Match was a bye (automatic advancement)

### Match Data JSON Structure
The `match_data` column can store additional match-specific information:
```json
{
  "gameMode": "best_of_3",
  "timeLimit": 30,
  "specialRules": ["no_items", "final_destination_only"],
  "streamUrl": "https://twitch.tv/example",
  "commentator": "John Doe",
  "notes": "High stakes match"
}
```

### Database Relationships
- **Tournaments Table**: `tournament_id` field references `tournaments.id`
- **Users Table**: `player1_id`, `player2_id`, `winner_id` fields reference `users.id`
- **Unique Constraint**: `(tournament_id, match_id)` ensures unique match identifiers per tournament

### Security Benefits
- Prevents users from creating matches for tournaments they don't own
- Ensures creators can manage their tournament matches even if public access is restricted
- Maintains data integrity by enforcing tournament ownership
- Allows for future admin features while maintaining security
- Supports flexible match identification across different tournament formats

### Performance Considerations
- **Match Lookups**: Queries by `tournament_id` are efficient
- **Player Lookups**: Queries by `player1_id` or `player2_id` for player-specific matches
- **Tournament Status**: RLS policies filter by tournament status for performance
- **JSON Data**: `match_data` column allows flexible storage without schema changes

### Usage Patterns

#### Tournament Creation Flow
1. **Create Tournament**: Tournament creator creates tournament
2. **Generate Matches**: Frontend generates matches and stores them
3. **Update Matches**: Creators update match results as tournament progresses
4. **Complete Tournament**: Final results stored in both individual matches and tournament bracket_data

#### Match Management Flow
1. **Schedule Match**: Match created with `scheduled` status
2. **Start Match**: Status updated to `in_progress`
3. **Complete Match**: Scores and winner recorded, status updated to `completed`
4. **Advance Winner**: Frontend logic advances winner to next round

#### System Operations
1. **Admin Management**: Service role can manage all matches for administrative purposes
2. **Data Migration**: Service role can handle bulk match operations
3. **Tournament Cleanup**: Service role can clean up completed tournaments
