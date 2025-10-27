# Tournament Management Implementation Guide

## Overview

This application uses [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) to manage tournament bracket logic and [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js) to display tournament brackets. The bracket data is stored in Supabase PostgreSQL using a JSONB column for flexible, efficient storage.

## Architecture

### Components

1. **brackets-manager.js**: Handles all tournament bracket logic (creation, updates, state management)
2. **brackets-viewer.js**: Renders tournament brackets visually
3. **Supabase**: Stores tournament data including complete bracket state in JSONB
4. **Tournaments Table**: Stores tournament metadata and bracket data

### Data Flow

```
User Action → brackets-manager.js → Serialize Data → Supabase → Fetch Data → brackets-viewer.js → Display
```

## Database Schema

### Table Relationships

The tournament system uses the following relationship chain:

```
Users → RSVPs → Events → Tournaments
```

**Relationships:**
- **RSVPs → Events**: `rsvps.event_id` → `events.id`
- **RSVPs → Users**: `rsvps.user_id` → `users.id`
- **Events → Users**: `events.host_id` → `users.id`
- **Tournaments → Events**: `tournaments.event_id` → `events.id`

**Data Flow:**
1. Users create events and other users RSVP
2. Tournament participants are derived from RSVPs with `status = 'going'`
3. Tournaments are created for specific events
4. Participants are seeded from RSVPs for that event

### Tournaments Table Structure

The `tournaments` table stores all tournament data:

```typescript
interface Tournament {
  id: uuid                    // Primary key
  event_id: uuid             // Foreign key to events table
  max_participants: integer  // Maximum number of participants
  min_participants: integer  // Minimum required participants
  status: text               // registration | seeding | active | completed | cancelled
  tournament_type: text       // single_elimination | double_elimination | round_robin | swiss
  name: text                 // Tournament name
  description: text          // Tournament description
  rules: text                // Tournament rules
  prize_pool: text           // Prize information
  created_at: timestamptz    // Creation timestamp
  updated_at: timestamptz    // Last update timestamp
  started_at: timestamptz    // Tournament start time
  completed_at: timestamptz  // Completion time
  bracket_data: jsonb        // Complete bracket state (NOT NULL, default '{}')
}
```

### Bracket Data Structure

The `bracket_data` column stores the complete bracket state in brackets-manager.js format:

```json
{
  "tournamentId": 0,
  "type": "single_elimination",
  "name": "Tournament Name",
  "seeding": [
    { "id": "uuid-1", "name": "Participant 1" },
    { "id": "uuid-2", "name": "Participant 2" }
  ],
  "settings": {
    "seedOrdering": ["natural"],
    "balanceByes": true
  },
  "bracketViewerData": {
    "participant": [...],
    "stage": [...],
    "group": [...],
    "round": [...],
    "match": [...]
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

## Implementation

### 1. Setting Up Dependencies

Install the required packages:

```bash
npm install brackets-manager brackets-viewer
```

Or include via CDN (for viewer only):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.css" />
<script src="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.js"></script>
```

### 2. Supabase Storage Implementation

**Note:** For this implementation, we store bracket data directly in the `tournaments.bracket_data` JSONB column rather than using brackets-manager's storage interface. This provides more control over serialization and better performance with Supabase.

However, if you need a full storage adapter for brackets-manager.js, here's a basic implementation:

Since brackets-manager.js requires a CRUD interface, we need to create a custom storage adapter for Supabase.

```javascript
import { BracketsManager } from 'brackets-manager';
import { supabase } from './lib/supabaseClient';

class SupabaseStorage {
  async select(table, filters = {}) {
    let query = supabase.from(table).select('*');
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async insert(table, values) {
    const { data, error } = await supabase
      .from(table)
      .insert(values)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async update(table, filters, values) {
    let query = supabase.from(table).update(values);
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    return data;
  }

  async delete(table, filters) {
    let query = supabase.from(table).delete();
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

const storage = new SupabaseStorage();
const manager = new BracketsManager(storage);
```

### 3. Creating a Tournament

#### Step 1: Create Tournament Record in Supabase

```javascript
async function createTournament(eventId, tournamentData) {
  const { name, description, tournamentType, maxParticipants } = tournamentData;
  
  // Create tournament record in Supabase
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      event_id: eventId,
      name: name,
      description: description,
      tournament_type: tournamentType,
      max_participants: maxParticipants,
      min_participants: 2,
      status: 'registration',
      bracket_data: {}
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

#### Step 2: Initialize Bracket Structure

```javascript
async function initializeTournamentBracket(tournamentId, participants) {
  // Get tournament from database
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('bracket_data, tournament_type')
    .eq('id', tournamentId)
    .single();
  
  if (error) throw error;
  
  // Prepare seeding data
  const seeding = participants.map((p, index) => ({
    id: p.id,
    name: p.name || `Participant ${index + 1}`
  }));
  
  // Create bracket stage using brackets-manager
  await manager.create.stage({
    tournamentId: tournamentId,
    name: 'Main Bracket',
    type: tournament.tournament_type,
    seeding: seeding.map(p => p.name), // brackets-manager expects just names
    settings: {
      seedOrdering: ['natural'],
      balanceByes: true
    }
  });
  
  // Get the generated bracket data
  const stageData = await manager.get.stageData(tournamentId);
  const tournamentData = await manager.get.tournamentData(tournamentId);
  
  // Serialize data for storage
  const bracketData = {
    tournamentId: tournamentId,
    type: tournament.tournament_type,
    name: tournament.name,
    seeding: seeding,
    settings: {
      seedOrdering: ['natural'],
      balanceByes: true
    },
    bracketViewerData: {
      participant: stageData.participant,
      stage: stageData.stage,
      group: stageData.group,
      round: stageData.round,
      match: stageData.match
    },
    metadata: {
      totalRounds: stageData.round?.length || 0,
      currentRound: 1,
      completedMatches: 0,
      totalMatches: stageData.match?.length || 0,
      winner: null,
      startDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString()
    }
  };
  
  // Update tournament with bracket data
  await supabase
    .from('tournaments')
    .update({ 
      bracket_data: bracketData,
      status: 'seeding'
    })
    .eq('id', tournamentId);
  
  return bracketData;
}
```

### 4. Updating Match Results

```javascript
async function updateMatchResult(tournamentId, matchId, scores) {
  // Get current tournament data
  const { data: tournament, error: fetchError } = await supabase
    .from('tournaments')
    .select('bracket_data')
    .eq('id', tournamentId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Update match using brackets-manager
  await manager.update.match({
    id: matchId,
    opponent1: { score: scores.opponent1 },
    opponent2: { score: scores.opponent2 }
  });
  
  // Get updated data
  const stageData = await manager.get.stageData(tournamentId);
  
  // Update bracket data in database
  const updatedBracketData = {
    ...tournament.bracket_data,
    bracketViewerData: {
      participant: stageData.participant,
      stage: stageData.stage,
      group: stageData.group,
      round: stageData.round,
      match: stageData.match
    },
    metadata: {
      ...tournament.bracket_data.metadata,
      completedMatches: stageData.match.filter(m => m.status === 3).length,
      lastUpdate: new Date().toISOString()
    }
  };
  
  // Update tournament record
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ 
      bracket_data: updatedBracketData,
      updated_at: new Date().toISOString()
    })
    .eq('id', tournamentId);
  
  if (updateError) throw updateError;
}
```

### 5. Displaying the Bracket

#### Using brackets-viewer.js

```javascript
async function renderTournamentBracket(tournamentId) {
  // Fetch tournament bracket data
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('bracket_data, tournament_type')
    .eq('id', tournamentId)
    .single();
  
  if (error) throw error;
  
  const { bracketViewerData } = tournament.bracket_data;
  
  // Render bracket
  window.bracketsViewer.render({
    stages: bracketViewerData.stage,
    matches: bracketViewerData.match,
    matchGames: bracketViewerData.match_game || [],
    participants: bracketViewerData.participant
  }, {
    selector: '#bracket',
    participantOriginPlacement: 'before',
    showSlotsOrigin: false,
    showLowerSlots: true,
    highlightedParticipant: null,
    participantOnClick: (participant) => {
      // Handle participant click
      console.log('Clicked:', participant);
    }
  });
}
```

#### React Implementation

```jsx
import { useEffect, useRef } from 'react';

function TournamentBracket({ tournamentId }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const loadBracket = async () => {
      // Import brackets-viewer dynamically
      const { renderBracket } = await import('brackets-viewer');
      
      // Fetch tournament data
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('bracket_data')
        .eq('id', tournamentId)
        .single();
      
      const { bracketViewerData } = tournament.bracket_data;
      
      // Render bracket
      renderBracket({
        stages: bracketViewerData.stage,
        matches: bracketViewerData.match,
        participants: bracketViewerData.participant
      }, {
        selector: containerRef.current,
        participantOriginPlacement: 'before'
      });
    };
    
    if (containerRef.current && tournamentId) {
      loadBracket();
    }
  }, [tournamentId]);
  
  return (
    <div>
      <div id="bracket" ref={containerRef}></div>
    </div>
  );
}
```

### 6. Loading Participants from RSVPs

Participants are loaded from RSVPs where users have RSVP'd 'going' to the event. The function joins with the users table to get participant information.

```javascript
async function getTournamentParticipants(eventId) {
  // Get RSVPs for the event where status is 'going'
  const { data: rsvps, error } = await supabase
    .from('rsvps')
    .select(`
      user_id,
      users (
        id,
        first_name,
        last_name,
        username
      )
    `)
    .eq('event_id', eventId)
    .eq('status', 'going');
  
  if (error) {
    console.error('Error fetching participants:', error);
    throw error;
  }
  
  if (!rsvps || rsvps.length === 0) {
    return [];
  }
  
  // Map RSVPs to participants
  const participants = rsvps.map(rsvp => {
    const user = rsvp.users;
    if (!user) {
      console.warn(`Missing user data for rsvp with user_id: ${rsvp.user_id}`);
      return {
        id: rsvp.user_id,
        name: `User ${rsvp.user_id}`
      };
    }
    
    return {
      id: rsvp.user_id,
      name: user.username || 
            `${user.first_name || ''} ${user.last_name || ''}`.trim() || 
            `User ${rsvp.user_id}`
    };
  });
  
  return participants;
}
```

**Key Points:**
- Only includes RSVPs with `status = 'going'`
- Joins with `users` table to get participant names
- Handles missing user data gracefully
- Returns empty array if no participants found

### 7. Complete Tournament Creation Flow

**Relationship Verification:** Before creating a tournament, verify the user is the host of the event.

```javascript
async function createEventTournament(eventId, tournamentConfig) {
  try {
    // Step 0: Verify event exists and user is the host
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, host_id')
      .eq('id', eventId)
      .single();
    
    if (eventError) throw eventError;
    if (!event) throw new Error('Event not found');
    
    // Optional: Verify current user is the event host
    // const { data: { user } } = await supabase.auth.getUser();
    // if (event.host_id !== user.id) {
    //   throw new Error('Only event hosts can create tournaments');
    // }
    
    // Step 1: Get participants from RSVPs for this event
    const participants = await getTournamentParticipants(eventId);
    
    if (participants.length < tournamentConfig.min_participants) {
      throw new Error(`Minimum ${tournamentConfig.min_participants} participants required`);
    }
    
    if (participants.length > tournamentConfig.max_participants) {
      throw new Error(`Maximum ${tournamentConfig.max_participants} participants allowed`);
    }
    
    // Step 2: Create tournament record linked to event
    const tournament = await createTournament(eventId, tournamentConfig);
    
    // Step 3: Initialize bracket with participants from RSVPs
    const bracketData = await initializeTournamentBracket(
      tournament.id, 
      participants
    );
    
    // Step 4: Update tournament status
    await supabase
      .from('tournaments')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', tournament.id);
    
    return tournament;
  } catch (error) {
    console.error('Failed to create tournament:', error);
    throw error;
  }
}
```

**Key Points:**
- Verifies event exists before creating tournament
- Checks event ownership (optional, RLS enforces this)
- Participants are loaded from RSVPs with `status = 'going'`
- Tournament is linked to event via `event_id`
- Bracket is initialized with participants from that event's RSVPs

## Tournament Types

### Single Elimination

Elimination after one loss.

```javascript
await createEventTournament(eventId, {
  name: 'Single Elimination Tournament',
  tournament_type: 'single_elimination',
  max_participants: 16,
  min_participants: 4
});
```

### Double Elimination

Players lose once before elimination.

```javascript
await createEventTournament(eventId, {
  name: 'Double Elimination Tournament',
  tournament_type: 'double_elimination',
  max_participants: 16,
  min_participants: 4
});
```

### Round Robin

All players face each other.

```javascript
await createEventTournament(eventId, {
  name: 'Round Robin Tournament',
  tournament_type: 'round_robin',
  max_participants: 8,
  min_participants: 3
});
```

## Status Management

Tournament status flow:

```
registration → seeding → active → completed
                      ↓
                   cancelled
```

```javascript
// Start tournament
async function startTournament(tournamentId) {
  await supabase
    .from('tournaments')
    .update({ 
      status: 'active',
      started_at: new Date().toISOString()
    })
    .eq('id', tournamentId);
}

// Complete tournament
async function completeTournament(tournamentId) {
  const tournament = await getTournament(tournamentId);
  const finalStandings = await manager.get.finalStandings(tournamentId);
  
  await supabase
    .from('tournaments')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
      bracket_data: {
        ...tournament.bracket_data,
        metadata: {
          ...tournament.bracket_data.metadata,
          winner: finalStandings[0]
        }
      }
    })
    .eq('id', tournamentId);
}
```

## Security & RLS Policies

Tournament data is protected by Row Level Security (RLS) policies in Supabase:

- **Public Read**: Anyone can view active tournaments
- **Host Management**: Event hosts can manage tournaments for their events
- **Service Role**: Full access for system operations
- **RSVP Access**: Users can view RSVPs for events they host (see `schema/rsvps.md`)

### Required RLS Policies

For the participant loading to work, ensure these policies exist:

**RSVPs Table:**
- Users can view RSVPs for events they host
- Public read access (optional, for event pages)

**Users Table:**
- Public read access for host information
- OR authenticated users can read limited user data

**Events Table:**
- Public read access for event details
- Hosts can manage their events

**Tournaments Table:**
- Public read access for active tournaments
- Event hosts can manage tournaments for their events

See `schema/tournaments.md`, `schema/rsvps.md`, and `schema/events.md` for complete policy documentation.

## Performance Considerations

### JSONB Indexing

Create a GIN index on the bracket_data column:

```sql
CREATE INDEX idx_tournaments_bracket_data 
ON tournaments USING GIN (bracket_data);
```

### Query Optimization

```javascript
// Efficient query for bracket display
const { data } = await supabase
  .from('tournaments')
  .select('bracket_data')
  .eq('id', tournamentId)
  .single();

// Only update bracket_data field for match updates
await supabase
  .from('tournaments')
  .update({
    bracket_data: newBracketData,
    updated_at: new Date()
  })
  .eq('id', tournamentId);
```

## Error Handling

```javascript
async function safeTournamentOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === 'PGRST116') {
      console.error('Tournament not found');
    } else if (error.code === '23505') {
      console.error('Duplicate tournament');
    } else {
      console.error('Operation failed:', error.message);
    }
    throw error;
  }
}
```

## Summary: Participants from RSVPs

### How It Works

```
User RSVPs 'going' to Event
    ↓ (rsvps.status = 'going')
RSVP Record Created
    ↓ (rsvps.event_id = events.id)
Event Linked to Tournament
    ↓ (tournaments.event_id = events.id)
Tournament Seeded with Participants
    ↓ (From rsvps.user_id → users.id)
Participant Names Displayed
```

**Important:** Participants come ONLY from RSVPs with `status = 'going'` for the tournament's event. Ensure:
1. Users have RSVP'd to the event
2. RSVP status is set to 'going'
3. Event exists and is linked to the tournament
4. Users table has proper data for participant names

## References

- [brackets-manager.js Documentation](https://drarig29.github.io/brackets-docs/getting-started/)
- [brackets-manager.js GitHub](https://github.com/Drarig29/brackets-manager.js)
- [brackets-viewer.js GitHub](https://github.com/Drarig29/brackets-viewer.js)
- [Tournament Schema](./schema/tournaments.md)
- [Events Schema](./schema/events.md)
- [RSVPs Schema](./schema/rsvps.md)
- [Users Schema](./schema/users.md)
