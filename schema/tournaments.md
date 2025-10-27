# Tournaments Table Row Level Security Policies

## Table Schema

The `tournaments` table stores information about gaming tournaments linked to events, using brackets-manager.js for bracket management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | gen_random_uuid() | Primary key |
| `event_id` | uuid | NO | null | Foreign key to events table |
| `max_participants` | integer | NO | 16 | Maximum number of participants |
| `min_participants` | integer | NO | 2 | Minimum number of participants required |
| `status` | text | NO | 'registration'::text | Tournament status (registration, seeding, active, completed, cancelled) |
| `tournament_type` | text | NO | 'single_elimination'::text | Tournament format (single_elimination, double_elimination, round_robin, swiss) |
| `name` | text | YES | null | Tournament name |
| `description` | text | YES | null | Tournament description |
| `rules` | text | YES | null | Tournament rules and regulations |
| `prize_pool` | text | YES | null | Prize pool information |
| `created_at` | timestamp with time zone | YES | now() | Record creation time |
| `updated_at` | timestamp with time zone | YES | now() | Record update time |
| `started_at` | timestamp with time zone | YES | null | Tournament start time |
| `completed_at` | timestamp with time zone | YES | null | Tournament completion time |
| `bracket_data` | jsonb | NO | '{}' | Complete bracket state stored as JSON |

## Database Migration

### Recommended Migration to Add New Columns

```sql
-- Add new optional metadata columns
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS prize_pool text,
ADD COLUMN IF NOT EXISTS started_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Ensure bracket_data has a default and is NOT NULL
ALTER TABLE tournaments 
ALTER COLUMN bracket_data SET DEFAULT '{}';

-- Make sure bracket_data is NOT NULL (will use default)
ALTER TABLE tournaments 
ALTER COLUMN bracket_data SET NOT NULL;

-- Create GIN index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_tournaments_bracket_data 
ON tournaments USING GIN (bracket_data);

-- Create index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_event_id 
ON tournaments(event_id);
```

**Note:** After migration, `bracket_data` will contain the full brackets-manager.js data structure with embedded match information. The separate `tournament_matches` table is no longer required for the new system.

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

### Policy 2: Event Hosts Can Manage Tournaments for Their Events
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
**Purpose**: Event hosts have full control over tournaments within their events

### Policy 3: Service Role Access
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
- **Event Host Management**: Event hosts can manage tournaments within their events
- **Authentication Required**: All write operations require authentication
- **Host ID Validation**: Ensures users can only manage tournaments for events they host

### Key Operations
- **Read**: Public access for active tournaments + Event host access to their tournaments
- **Create**: Event hosts only (must be host of the linked event)
- **Update**: Event host-only access to their event tournaments
- **Delete**: Event host-only access to their event tournaments
- **System**: Service role for administrative operations

### Policy Enforcement
- **INSERT**: Users can only create tournaments for events they host
- **SELECT**: Public read for active tournaments + Event host read of their tournaments
- **UPDATE**: Event hosts can only update tournaments for their events
- **DELETE**: Event hosts can only delete tournaments for their events

### Tournament Types Supported
- **Single Elimination**: Traditional knockout tournament
- **Double Elimination**: Players must lose twice to be eliminated
  - Winners bracket: Players advance until they lose once
  - Losers bracket: Players who lose in winners bracket get a second chance
  - Grand Finals: Winner of winners bracket vs winner of losers bracket
- **Round Robin**: Everyone plays everyone else
- **Swiss**: Pairing-based tournament with standings

### JSON Bracket Data Structure (brackets-manager.js Format)
The `bracket_data` column stores complete tournament state in brackets-manager.js format:
```json
{
  "tournamentId": 0,
  "name": "Single Elimination Tournament",
  "type": "single_elimination",
  "seeding": [
    {
      "id": "uuid-participant-1",
      "name": "Player 1"
    },
    {
      "id": "uuid-participant-2",
      "name": "Player 2"
    }
  ],
  "settings": {
    "seedOrdering": ["natural"],
    "balanceByes": true
  },
  "bracketViewerData": {
    "participant": [
      { "id": "uuid-participant-1", "tournament_id": 0 }
    ],
    "stage": [
      {
        "id": 0,
        "tournament_id": 0,
        "name": "Main Stage",
        "type": "single_elimination",
        "status": 1
      }
    ],
    "group": [
      {
        "id": 0,
        "stage_id": 0,
        "number": 0
      }
    ],
    "round": [
      {
        "id": 0,
        "stage_id": 0,
        "group_id": 0,
        "number": 0,
        "name": "Round 1"
      }
    ],
    "match": [
      {
        "id": 0,
        "status": 1,
        "stage_id": 0,
        "group_id": 0,
        "round_id": 0,
        "number": 0,
        "opponent1": {
          "id": "uuid-participant-1",
          "position": 1,
          "score": 0,
          "result": null
        },
        "opponent2": {
          "id": "uuid-participant-2",
          "position": 2,
          "score": 0,
          "result": null
        }
      }
    ]
  },
  "metadata": {
    "totalRounds": 4,
    "currentRound": 1,
    "completedMatches": 0,
    "totalMatches": 15,
    "winner": null,
    "startDate": "2024-01-15T10:00:00Z",
    "lastUpdate": "2024-01-15T11:30:00Z"
  }
}
```

**Key Components:**
- `tournamentId`: Internal ID used by brackets-manager.js
- `type`: Tournament format (single_elimination, double_elimination, round_robin, swiss)
- `seeding`: Initial participant list
- `bracketViewerData`: Complete dataset for brackets-viewer.js rendering
- `metadata`: Cached statistics for quick access (completion tracking, winner, etc.)

### Security Benefits
- Prevents users from creating tournaments for events they don't host
- Ensures event hosts can manage their tournaments even if public access is restricted
- Maintains data integrity by enforcing event host ownership
- Allows for future admin features while maintaining security
- Supports multiple tournament formats with flexible JSON storage

### Database Relationships
- **Events Table**: `event_id` field references `events.id` (tournament creator is the event host)
- **RSVPs Table**: Tournament participants derived from `rsvps` where `event_id` matches

### Implementation Notes for brackets-manager.js

**Storage Approach:**
- All bracket data (matches, rounds, participants) stored in `bracket_data` JSONB column
- brackets-manager.js manages bracket state in-memory during operations
- Complete bracket state persisted to `bracket_data` after updates
- brackets-viewer.js reads from `bracketViewerData` for rendering

**Data Flow:**
1. Create tournament → brackets-manager.js generates bracket structure
2. Serialize bracket data → Store in `bracket_data.bracketViewerData`
3. Update match results → brackets-manager.js updates state → Re-serialize → Update DB
4. Render bracket → brackets-viewer.js reads `bracketViewerData`

**Performance:**
- Index on `bracket_data` column for faster queries: `CREATE INDEX idx_tournaments_bracket_data ON tournaments USING GIN (bracket_data);`
- Metadata caching in `bracket_data.metadata` for quick statistics access
- No separate `tournament_matches` table needed (all data embedded in JSONB)
