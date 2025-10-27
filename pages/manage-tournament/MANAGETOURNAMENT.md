# Tournament Management Implementation Guide

## Overview

This application uses [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) to manage tournament bracket logic and [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js) to display tournament brackets. The bracket data is stored in Supabase PostgreSQL using a JSONB column for flexible, efficient storage.

**Key Libraries:**
- [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) - Manages tournament logic (306 stars)
- [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js) - Visual bracket rendering (205 stars)

**Documentation:** https://drarig29.github.io/brackets-docs/

## Automatic Tournament Generation

When an event is created, a tournament is automatically generated with those event details. The tournament defaults to **single elimination** format.

**Automatic Behavior:**
- Tournament is created automatically upon event creation
- Uses event details (name, description, date, etc.)
- Default tournament type: `single_elimination`
- Tournament starts in `registration` status
- Participants are seeded from RSVPs once users RSVP as 'going'

**Customization:**
- Tournament type can be changed by event hosts
- Tournament settings (max/min participants, rules, prize pool) can be modified
- Event hosts can start, manage, and complete tournaments

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
1. User creates an event → Tournament is automatically generated with event details (defaults to single elimination)
2. Other users RSVP to the event
3. Tournament participants are derived from RSVPs with `status = 'going'`
4. Tournament bracket is initialized and participants are seeded when tournament starts

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

The `bracket_data` column stores the complete bracket state in brackets-manager.js format. This is the **raw data structure** that brackets-manager uses internally:

```json
{
  "participant": [
    {
      "id": 0,
      "tournament_id": 0,
      "name": "Team 1"
    },
    {
      "id": 1,
      "tournament_id": 0,
      "name": "Team 2"
    }
  ],
  "stage": [
    {
      "id": 0,
      "tournament_id": 0,
      "name": "Main Bracket",
      "type": "single_elimination",
      "number": 1,
      "settings": {}
    }
  ],
  "group": [
    {
      "id": 0,
      "stage_id": 0,
      "number": 1
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
      "stage_id": 0,
      "group_id": 0,
      "round_id": 0,
      "number": 0,
      "status": 0,
      "opponent1": {
        "id": 0,
        "position": 1,
        "score": 0,
        "result": "win"
      },
      "opponent2": {
        "id": 1,
        "position": 2,
        "score": 0,
        "result": "loss"
      }
    }
  ]
}
```

**Important:** This is the exact structure that brackets-manager.js creates. We store this directly in Supabase JSONB.

## Implementation

### 1. Setting Up Dependencies

Install the required packages:

```bash
npm install brackets-manager brackets-memory-db brackets-viewer
```

**Note:** 
- `brackets-manager` - Manages tournament bracket logic
- `brackets-memory-db` - Provides InMemoryDatabase storage
- `brackets-viewer` - Renders tournament brackets visually

For Next.js, you can use either:
1. CDN approach (recommended for client-side rendering)
2. npm package with dynamic imports

### 2. Storage Approach - In-Memory + JSONB

**How it works:** We use brackets-manager.js's InMemoryDatabase to create and manage brackets, then serialize the data to Supabase JSONB. When loading, we deserialize and recreate the in-memory database.

**Why this approach?**
- Simpler than building a full Supabase adapter
- Better performance - all bracket logic happens in-memory
- Easier to understand and debug
- Direct control over serialization

**Next.js Considerations:**
- Use `brackets-memory-db` (not from `brackets-manager`) for InMemoryDatabase
- Client-side only rendering for brackets (use `useEffect` with proper checks)
- CDN approach works best for Next.js to avoid SSR issues

```javascript
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { supabase } from './lib/supabaseClient';

// Create a fresh in-memory database for each operation
function createManager() {
  const storage = new InMemoryDatabase();
  return new BracketsManager(storage);
}
```

**Key Points:**
- We create a new manager instance for each operation
- The manager operates on in-memory data
- We save/load the entire bracket state to/from Supabase
- No database adapter needed!

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
  
  // Create fresh in-memory manager
  const manager = createManager();
  
  // Prepare seeding data (just names for brackets-manager)
  const seeding = participants.map(p => p.name || 'Participant');
  
  // Create bracket stage using brackets-manager
  // Note: tournamentId should be 0 for in-memory operations
  await manager.create.stage({
    tournamentId: 0,
    name: 'Main Bracket',
    type: tournament.tournament_type, // single_elimination, double_elimination, round_robin, swiss
    seeding: seeding,
    settings: {
      seedOrdering: ['natural'],
      balanceByes: true
    }
  });
  
  // Get ALL bracket data from in-memory storage
  const storage = manager.storage;
  const bracketData = {
    participant: await storage.select('participant'),
    stage: await storage.select('stage'),
    group: await storage.select('group'),
    round: await storage.select('round'),
    match: await storage.select('match')
  };
  
  // Update tournament with bracket data
  const { error: updateError } = await supabase
    .from('tournaments')
    .update({ 
      bracket_data: bracketData,
      status: 'seeding'
    })
    .eq('id', tournamentId);
  
  if (updateError) throw updateError;
  
  return bracketData;
}
```

**What this does:**
1. Creates a fresh in-memory database
2. Uses brackets-manager to generate bracket structure
3. Extracts the raw data (participant, stage, group, round, match)
4. Saves it to Supabase as JSONB

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
  
  // Create manager and load existing bracket data
  const manager = createManager();
  const storage = manager.storage;
  
  // Load existing bracket data into in-memory database
  // Option 1: Insert data directly into storage
  const bracketData = tournament.bracket_data;
  await storage.insert('participant', bracketData.participant || []);
  await storage.insert('stage', bracketData.stage || []);
  await storage.insert('group', bracketData.group || []);
  await storage.insert('round', bracketData.round || []);
  await storage.insert('match', bracketData.match || []);
  
  // Update match using brackets-manager
  await manager.update.match({
    id: matchId,
    opponent1: { score: scores.opponent1 },
    opponent2: { score: scores.opponent2 }
  });
  
  // Get updated data from in-memory storage
  const updatedBracketData = {
    participant: await storage.select('participant'),
    stage: await storage.select('stage'),
    group: await storage.select('group'),
    round: await storage.select('round'),
    match: await storage.select('match')
  };
  
  // Update tournament record in Supabase
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

**How this works:**
1. Load bracket data from Supabase into in-memory database
2. Use brackets-manager to update the match
3. Extract updated data from in-memory storage
4. Save back to Supabase

### 5. Displaying the Bracket

#### Using brackets-viewer.js (Vanilla JS)

For vanilla JavaScript (using CDN):

```javascript
async function renderTournamentBracket(tournamentId) {
  // Fetch tournament bracket data
  const { data: tournament, error } = await supabase
    .from('tournaments')
    .select('bracket_data')
    .eq('id', tournamentId)
    .single();
  
  if (error) throw error;
  
  // Render bracket (brackets-viewer.js expects the data structure directly)
  window.bracketsViewer.render({
    stages: tournament.bracket_data.stage,
    matches: tournament.bracket_data.match,
    participants: tournament.bracket_data.participant
  }, {
    selector: '#bracket',
    participantOriginPlacement: 'before',
    showSlotsOrigin: false,
    showLowerSlots: true,
    highlightedParticipant: null,
    participantOnClick: (participant) => {
      console.log('Clicked:', participant);
    }
  });
}
```

#### React/Next.js Implementation

For Next.js applications, you can use brackets-viewer with dynamic imports:

**Option 1: Using CDN (Recommended for Next.js)**

```jsx
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

function TournamentBracket({ tournamentId }) {
  const containerRef = useRef(null);
  const [viewerLoaded, setViewerLoaded] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current || !tournamentId || !viewerLoaded) return;
    
    const loadBracket = async () => {
      try {
        // Fetch tournament data
        const { data: tournament, error } = await supabase
          .from('tournaments')
          .select('bracket_data')
          .eq('id', tournamentId)
          .single();
        
        if (error) throw error;
        
        // Create BracketsViewer instance and render
        const viewer = new window.bracketsViewer();
        viewer.render({
          stages: tournament.bracket_data.stage,
          matches: tournament.bracket_data.match,
          participants: tournament.bracket_data.participant
        }, {
          selector: containerRef.current
        });
      } catch (error) {
        console.error('Error loading bracket:', error);
      }
    };
    
    loadBracket();
  }, [tournamentId, viewerLoaded]);
  
  return (
    <>
      <Script 
        src="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.js"
        onLoad={() => setViewerLoaded(true)}
      />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.css" />
      <div ref={containerRef}></div>
    </>
  );
}
```

**Option 2: Using npm package (Alternative)**

```jsx
import { useEffect, useRef } from 'react';
import { BracketsViewer } from 'brackets-viewer';
import { supabase } from '../lib/supabaseClient';

function TournamentBracket({ tournamentId }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current || !tournamentId) return;
    
    const loadBracket = async () => {
      try {
        // Fetch tournament data
        const { data: tournament, error } = await supabase
          .from('tournaments')
          .select('bracket_data')
          .eq('id', tournamentId)
          .single();
        
        if (error) throw error;
        
        // Create viewer instance and render
        const viewer = new BracketsViewer();
        viewer.render({
          stages: tournament.bracket_data.stage,
          matches: tournament.bracket_data.match,
          participants: tournament.bracket_data.participant
        }, {
          selector: containerRef.current
        });
      } catch (error) {
        console.error('Error loading bracket:', error);
      }
    };
    
    loadBracket();
  }, [tournamentId]);
  
  return <div ref={containerRef}></div>;
}
```

**Important Notes for Next.js/React:**
- Use `new BracketsViewer()` to create an instance
- Call `render()` method with data and config
- The selector should be the DOM element, not a string
- Use dynamic imports or CDN for better Next.js compatibility

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
User Creates Event
    ↓
Tournament Automatically Generated (defaults to single_elimination)
    ↓ (tournaments.event_id = events.id)
Users RSVP 'going' to Event
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

## Complete Example File

Here's a complete implementation you can copy and use:

```javascript
// lib/tournamentManager.js
import { BracketsManager, InMemoryDatabase } from 'brackets-manager';
import { supabase } from './supabaseClient';

// Create fresh in-memory manager
function createManager() {
  const storage = new InMemoryDatabase();
  return new BracketsManager(storage);
}

// Get participants from RSVPs
async function getTournamentParticipants(eventId) {
  const { data: rsvps, error } = await supabase
    .from('rsvps')
    .select('user_id, users(id, first_name, last_name, username)')
    .eq('event_id', eventId)
    .eq('status', 'going');
  
  if (error) throw error;
  if (!rsvps || rsvps.length === 0) return [];
  
  return rsvps.map(rsvp => ({
    id: rsvp.user_id,
    name: rsvp.users.username || 
          `${rsvp.users.first_name || ''} ${rsvp.users.last_name || ''}`.trim() || 
          `User ${rsvp.user_id}`
  }));
}

// Create tournament
async function createEventTournament(eventId, tournamentConfig) {
  try {
    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, host_id')
      .eq('id', eventId)
      .single();
    
    if (eventError) throw eventError;
    if (!event) throw new Error('Event not found');
    
    // Get participants
    const participants = await getTournamentParticipants(eventId);
    
    if (participants.length < tournamentConfig.min_participants) {
      throw new Error(`Minimum ${tournamentConfig.min_participants} participants required`);
    }
    if (participants.length > tournamentConfig.max_participants) {
      throw new Error(`Maximum ${tournamentConfig.max_participants} participants allowed`);
    }
    
    // Create tournament record
    const { data: tournament, error } = await supabase
      .from('tournaments')
      .insert({
        event_id: eventId,
        name: tournamentConfig.name,
        description: tournamentConfig.description,
        tournament_type: tournamentConfig.tournament_type,
        max_participants: tournamentConfig.max_participants,
        min_participants: tournamentConfig.min_participants,
        status: 'registration',
        bracket_data: {}
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Initialize bracket
    const manager = createManager();
    const seeding = participants.map(p => p.name);
    
    await manager.create.stage({
      tournamentId: 0,
      name: 'Main Bracket',
      type: tournamentConfig.tournament_type,
      seeding: seeding,
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true
      }
    });
    
    // Get bracket data
    const storage = manager.storage;
    const bracketData = {
      participant: await storage.select('participant'),
      stage: await storage.select('stage'),
      group: await storage.select('group'),
      round: await storage.select('round'),
      match: await storage.select('match')
    };
    
    // Save to Supabase
    await supabase
      .from('tournaments')
      .update({ 
        bracket_data: bracketData,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', tournament.id);
    
    return tournament;
  } catch (error) {
    console.error('Failed to create tournament:', error);
    throw error;
  }
}

// Update match
async function updateMatchResult(tournamentId, matchId, scores) {
  const { data: tournament, error: fetchError } = await supabase
    .from('tournaments')
    .select('bracket_data')
    .eq('id', tournamentId)
    .single();
  
  if (fetchError) throw fetchError;
  
  const manager = createManager();
  const storage = manager.storage;
  
  // Load existing data
  const bracketData = tournament.bracket_data;
  await storage.insert('participant', bracketData.participant || []);
  await storage.insert('stage', bracketData.stage || []);
  await storage.insert('group', bracketData.group || []);
  await storage.insert('round', bracketData.round || []);
  await storage.insert('match', bracketData.match || []);
  
  // Update match
  await manager.update.match({
    id: matchId,
    opponent1: { score: scores.opponent1 },
    opponent2: { score: scores.opponent2 }
  });
  
  // Get updated data
  const updatedBracketData = {
    participant: await storage.select('participant'),
    stage: await storage.select('stage'),
    group: await storage.select('group'),
    round: await storage.select('round'),
    match: await storage.select('match')
  };
  
  // Save to Supabase
  await supabase
    .from('tournaments')
    .update({ 
      bracket_data: updatedBracketData,
      updated_at: new Date().toISOString()
    })
    .eq('id', tournamentId);
}

export { createEventTournament, updateMatchResult, getTournamentParticipants };
```

## Troubleshooting

### Common Issues

**Issue: "Cannot read property 'storage' of undefined"**
- Make sure you imported `InMemoryDatabase` from `brackets-memory-db` (not from brackets-manager)
- Use `createManager()` to create a new manager for each operation

**Issue: "Match not found" when updating**
- Ensure you're using the correct match ID
- Match IDs are integers (0, 1, 2, etc.) not UUIDs

**Issue: Bracket not rendering in Next.js**
- Check that `bracket_data` is not empty
- Verify bracket_data structure matches the expected format (participant, stage, group, round, match)
- For React/Next.js, ensure you're using `selector: containerRef.current` (DOM element, not string)
- Make sure you wait for the CDN script to load before rendering (use `useState` for `viewerLoaded` flag)
- Check browser console for any JavaScript errors

**Issue: Participants not loading**
- Verify users have RSVP'd with `status = 'going'`
- Check RLS policies allow reading RSVPs and users tables
- Ensure users table has proper data
- Check that the Supabase query includes proper foreign key relationships

**Issue: "Minimum participants required" error**
- Users must RSVP as 'going' before creating tournament
- Check that `rsvps.status` = 'going'
- Verify at least 2 participants exist for the event

**Issue: Data not loading into in-memory database**
- Insert data one by one if bulk insert doesn't work:
  ```javascript
  for (const participant of bracketData.participant || []) {
    await storage.insert('participant', participant);
  }
  ```

**Issue: Next.js SSR errors with brackets-viewer**
- brackets-viewer requires browser APIs and should only run client-side
- Use `useEffect` with proper dependency checks
- Use CDN approach instead of dynamic imports for better compatibility
- Ensure `typeof window !== 'undefined'` checks are in place

**Issue: "bracketsViewer is not defined" in Next.js**
- Wait for the CDN script to load using `Script` component's `onLoad` callback
- Check that the script is loaded before attempting to render
- Use `typeof window !== 'undefined' && window.bracketsViewer` check

### Performance Optimization

For loading many tournaments at once:

```javascript
// Bulk load all bracket data
async function getAllTournaments(eventId) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, bracket_data')
    .eq('event_id', eventId);
  
  // Process all tournaments
  return data.map(t => ({
    id: t.id,
    name: t.name,
    matches: t.bracket_data.match,
    participants: t.bracket_data.participant
  }));
}
```

### Testing Your Implementation

1. Create a test event
2. Have users RSVP as 'going'
3. Create tournament:
   ```javascript
   await createEventTournament(eventId, {
     name: 'Test Tournament',
     tournament_type: 'single_elimination',
     max_participants: 8,
     min_participants: 2
   });
   ```
4. Update a match:
   ```javascript
   await updateMatchResult(tournamentId, 0, { opponent1: 10, opponent2: 5 });
   ```
5. Render the bracket and verify it displays correctly

## Quick Start Checklist

1. **Install packages:**
   ```bash
   npm install brackets-manager brackets-memory-db brackets-viewer
   ```

2. **Create the tournament helper file:**
   - Copy the complete example above to `lib/tournamentManager.js`
   - Ensure imports are correct: `InMemoryDatabase` from `brackets-memory-db`

3. **Import in your page:**
   ```javascript
   import { createEventTournament } from '../lib/tournamentManager';
   ```

4. **Use it:**
   ```javascript
   await createEventTournament(eventId, {
     name: 'Single Elimination Tournament',
     tournament_type: 'single_elimination',
     max_participants: 16,
     min_participants: 4
   });
   ```

5. **For Next.js client-side rendering:**
   - Use `useEffect` for bracket rendering
   - Use CDN approach with `Script` component for loading brackets-viewer
   - Always check `typeof window !== 'undefined'` before using browser APIs

## References

- [brackets-manager.js Documentation](https://drarig29.github.io/brackets-docs/getting-started/)
- [brackets-manager.js GitHub](https://github.com/Drarig29/brackets-manager.js)
- [brackets-viewer.js GitHub](https://github.com/Drarig29/brackets-viewer.js)
- [Tournament Schema](./schema/tournaments.md)
- [Events Schema](./schema/events.md)
- [RSVPs Schema](./schema/rsvps.md)
- [Users Schema](./schema/users.md)
