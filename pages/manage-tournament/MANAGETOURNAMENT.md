# Tournament Management System

## Overview
Complete implementation guide for single and double elimination tournament management using [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) for bracket logic and a custom vertical bracket viewer for visualization.

## System Architecture

### Core Components
- **Tournament Manager Service**: Handles all bracket operations
- **Participant Management**: Draws from RSVPs table
- **Bracket Visualization**: Real-time bracket updates
- **Match Management**: Score input and result updates
- **Database Integration**: Stores bracket state in `bracket_data` JSONB column

### Data Flow
1. **Load Participants**: Fetch RSVPs for tournament event
2. **Create Bracket**: Generate single elimination bracket
3. **Update Matches**: Record scores and advance winners
4. **Real-time Sync**: Bracket visualization updates automatically
5. **Persist State**: Save bracket data to tournaments table

## Implementation Plan

### Phase 1: Core Service Layer

#### 1.1 Tournament Manager Service
Create `/lib/tournamentManager.js`:

```javascript
import { BracketsManager } from 'brackets-manager';
import { MemoryDatabase } from 'brackets-memory-db';
import { supabase } from './supabaseClient';

class TournamentManager {
  constructor() {
    this.storage = new MemoryDatabase();
    this.manager = new BracketsManager(this.storage);
  }

  // Load participants from RSVPs table
  async getParticipants(tournamentId) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('event_id')
      .eq('id', tournamentId)
      .single();

    const { data: rsvps } = await supabase
      .from('rsvps')
      .select(`
        user_id,
        users!inner(first_name, last_name)
      `)
      .eq('event_id', tournament.event_id)
      .eq('status', 'going');

    return rsvps.map(rsvp => ({
      id: rsvp.user_id,
      name: `${rsvp.users.first_name} ${rsvp.users.last_name}`
    }));
  }

  // Create single elimination tournament
  async createTournament(tournamentId, tournamentName) {
    const participants = await this.getParticipants(tournamentId);
    
    if (participants.length < 2) {
      throw new Error('Need at least 2 participants');
    }

    const stage = await this.manager.create.stage({
      tournamentId: parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16),
      name: tournamentName,
      type: 'single_elimination',
      seeding: participants.map(p => p.name),
      settings: {
        seedOrdering: ['natural'],
        balanceByes: true
      }
    });

    // Save to database
    await this.saveBracketData(tournamentId, stage);
    return stage;
  }

  // Update match result
  async updateMatch(tournamentId, matchId, opponent1Score, opponent2Score) {
    const bracketData = await this.loadBracketData(tournamentId);
    
    // Load bracket into memory
    await this.loadBracketIntoMemory(bracketData);

    const match = await this.manager.update.match({
      id: matchId,
      opponent1: {
        score: opponent1Score,
        result: opponent1Score > opponent2Score ? 'win' : 'loss'
      },
      opponent2: {
        score: opponent2Score,
        result: opponent2Score > opponent1Score ? 'win' : 'loss'
      }
    });

    // Save updated bracket
    await this.saveBracketData(tournamentId, bracketData);
    return match;
  }

  // Get current matches
  async getCurrentMatches(tournamentId) {
    const bracketData = await this.loadBracketData(tournamentId);
    await this.loadBracketIntoMemory(bracketData);
    
    return await this.manager.get.currentMatches(
      parseInt(tournamentId.replace(/-/g, '').slice(0, 8), 16)
    );
  }

  // Get bracket data for visualization
  async getBracketData(tournamentId) {
    const bracketData = await this.loadBracketData(tournamentId);
    return bracketData.bracketViewerData;
  }

  // Save bracket data to database
  async saveBracketData(tournamentId, bracketData) {
    const { error } = await supabase
      .from('tournaments')
      .update({ bracket_data: bracketData })
      .eq('id', tournamentId);

    if (error) throw error;
  }

  // Load bracket data from database
  async loadBracketData(tournamentId) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('bracket_data')
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    return data.bracket_data;
  }

  // Load bracket into memory storage
  async loadBracketIntoMemory(bracketData) {
    // Clear existing data
    this.storage.reset();
    
    // Load tournament data
    if (bracketData.bracketViewerData) {
      const data = bracketData.bracketViewerData;
      
      // Load participants
      if (data.participant) {
        for (const participant of data.participant) {
          await this.storage.insert.participant(participant);
        }
      }
      
      // Load stages
      if (data.stage) {
        for (const stage of data.stage) {
          await this.storage.insert.stage(stage);
        }
      }
      
      // Load groups
      if (data.group) {
        for (const group of data.group) {
          await this.storage.insert.group(group);
        }
      }
      
      // Load rounds
      if (data.round) {
        for (const round of data.round) {
          await this.storage.insert.round(round);
        }
      }
      
      // Load matches
      if (data.match) {
        for (const match of data.match) {
          await this.storage.insert.match(match);
        }
      }
    }
  }
}

export default new TournamentManager();
```

### Phase 2: React Components

#### 2.1 Match Manager Component
Create `/pages/manage-tournament/MatchManager.js`:

```javascript
import { useState, useEffect } from 'react';
import tournamentManager from '../../lib/tournamentManager';

export default function MatchManager({ tournamentId }) {
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournamentName, setTournamentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [participantsData, currentMatches] = await Promise.all([
        tournamentManager.getParticipants(tournamentId),
        tournamentManager.getCurrentMatches(tournamentId)
      ]);
      
      setParticipants(participantsData);
      setMatches(currentMatches || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTournament = async () => {
    try {
      setLoading(true);
      await tournamentManager.createTournament(tournamentId, tournamentName);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateMatchResult = async (matchId, opponent1Score, opponent2Score) => {
    try {
      await tournamentManager.updateMatch(tournamentId, matchId, opponent1Score, opponent2Score);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading tournament...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="tournament-manager">
      <div className="participants-section">
        <h3>Participants ({participants.length})</h3>
        <div className="participants-list">
          {participants.map(participant => (
            <div key={participant.id} className="participant-item">
              {participant.name}
            </div>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="create-tournament">
          <h3>Create Tournament</h3>
          <input
            type="text"
            placeholder="Tournament Name"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
          />
          <button 
            onClick={createTournament}
            disabled={participants.length < 2 || !tournamentName}
          >
            Create Single Elimination Tournament
          </button>
        </div>
      ) : (
        <div className="matches-section">
          <h3>Current Matches</h3>
          {matches.map(match => (
            <MatchCard 
              key={match.id} 
              match={match} 
              onUpdate={updateMatchResult}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, onUpdate }) {
  const [opponent1Score, setOpponent1Score] = useState('');
  const [opponent2Score, setOpponent2Score] = useState('');

  const handleSubmit = () => {
    if (opponent1Score && opponent2Score) {
      onUpdate(match.id, parseInt(opponent1Score), parseInt(opponent2Score));
      setOpponent1Score('');
      setOpponent2Score('');
    }
  };

  return (
    <div className="match-card">
      <div className="participants">
        <span>{match.opponent1?.name || 'TBD'}</span>
        <span>vs</span>
        <span>{match.opponent2?.name || 'TBD'}</span>
      </div>
      
      {match.status === 'ready' && (
        <div className="score-input">
          <input 
            type="number" 
            placeholder="Score 1"
            value={opponent1Score}
            onChange={(e) => setOpponent1Score(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="Score 2"
            value={opponent2Score}
            onChange={(e) => setOpponent2Score(e.target.value)}
          />
          <button onClick={handleSubmit}>
            Submit Result
          </button>
        </div>
      )}
      
      {match.status === 'completed' && (
        <div className="match-result">
          {match.opponent1.name}: {match.opponent1.score} - {match.opponent2.score} :{match.opponent2.name}
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Vertical Bracket Viewer Component
Create `/pages/manage-tournament/VerticalBracketViewer.js`:

**Custom bracket viewer that renders bracket_data in a vertical, minimal layout with real-time tournament statistics.**

Key Features:
- No external dependencies (renders bracket_data directly)
- Tournament progress tracking (participants, matches, completion %)
- Minimal design with 8px spacing system
- Scales beautifully for 64+ participants
- Round-based organization with traditional names (Quarterfinals, Semifinals, Finals)
- Match status indicators (Active, Pending, Complete)
- Winner highlighting and score display

See `VerticalBracketViewer.js` in the repository for full implementation.

### Phase 3: Main Tournament Page
Update `/pages/manage-tournament/[id].js`:

```javascript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import MatchManager from './MatchManager';
import VerticalBracketViewer from './VerticalBracketViewer';

export default function ManageTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTournament();
    }
  }, [id]);

  const loadTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!tournament) return <div>Tournament not found</div>;

  return (
    <div className="manage-tournament">
      <h1>{tournament.name || 'Tournament Management'}</h1>
      
      <div className="tabs">
        <button 
          className={activeTab === 'manage' ? 'active' : ''}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
        <button 
          className={activeTab === 'bracket' ? 'active' : ''}
          onClick={() => setActiveTab('bracket')}
        >
          View Bracket
        </button>
      </div>

      {activeTab === 'manage' && (
        <MatchManager tournamentId={id} />
      )}

      {activeTab === 'bracket' && (
        <VerticalBracketViewer tournamentId={id} />
      )}
    </div>
  );
}
```

### Phase 4: Styling
Create `/pages/manage-tournament/tournament.module.css`:

```css
.tournament-manager {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.participants-section {
  margin-bottom: 32px;
}

.participants-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.participant-item {
  padding: 12px;
  background: #f8f8f8;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  text-align: center;
}

.create-tournament {
  padding: 24px;
  background: #f8f8f8;
  border-radius: 8px;
  text-align: center;
}

.create-tournament input {
  width: 100%;
  max-width: 400px;
  padding: 12px;
  margin: 16px 0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 16px;
}

.create-tournament button {
  padding: 12px 24px;
  background: #000;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.create-tournament button:disabled {
  background: #a0a0a0;
  cursor: not-allowed;
}

.matches-section {
  margin-top: 32px;
}

.match-card {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
  background: white;
}

.participants {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 500;
  font-size: 18px;
}

.score-input {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.score-input input {
  width: 80px;
  padding: 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  text-align: center;
}

.score-input button {
  padding: 8px 16px;
  background: #000;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.match-result {
  text-align: center;
  font-weight: 500;
  color: #404040;
}

.tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid #e8e8e8;
}

.tabs button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  border-bottom: 2px solid transparent;
}

.tabs button.active {
  border-bottom-color: #000;
  font-weight: 500;
}

.bracket-container {
  width: 100%;
  overflow-x: auto;
  padding: 24px 0;
}
```

## Key Features

### ✅ Participant Management
- Automatically loads participants from RSVPs table
- Shows participant count and names
- Validates minimum 2 participants for tournament creation

### ✅ Tournament Formats
- **Single Elimination**: Traditional bracket where losing once eliminates you
- **Double Elimination**: Losers get a second chance in the loser's bracket
  - Winner Bracket: Main bracket for undefeated participants
  - Loser Bracket: Second-chance bracket for participants with one loss
  - Grand Final: Winner of each bracket face off
  - **Grand Finals Reset**: If the loser's bracket winner wins the first grand final match, a reset match is played
    - This ensures both finalists have the same number of losses (fairness principle)
    - The winner's bracket finalist gets one "life" advantage
    - If they lose the first grand final, a second match determines the champion
- Format can be changed from the Configuration panel
- Changing format regenerates the entire bracket

### ✅ Tournament Creation
- Configurable format (single or double elimination)
- Automatic bracket generation with BYE handling
- Tournament name from tournaments table
- Bracket data stored in `bracket_data` JSONB column

### ✅ Match Management
- Real-time match result input
- Score validation and winner determination
- Automatic bracket advancement
- Match status tracking (ready, completed)

### ✅ Bracket Visualization
- Custom vertical bracket viewer (no external dependencies)
- Real-time tournament progress statistics
- Minimal design with 8px spacing system
- Scales beautifully for 64+ participants
- Traditional round names (Quarterfinals, Semifinals, Finals)
- Match status indicators (Active, Pending, Complete)
- Winner highlighting and score display

### ✅ Real-time Updates
- Bracket visualization updates immediately after match results
- Persistent state in database
- Seamless data flow between components

## Usage Flow

1. **Visit Tournament Page**: Navigate to `/manage-tournament/[id]`
2. **View Participants**: See RSVP participants for the event
3. **Select Format**: Click "Edit" in Configuration panel to choose Single or Double Elimination
4. **Create Tournament**: Tournament bracket generates automatically with selected format
5. **Manage Matches**: Input scores for current matches
6. **View Bracket**: Bracket displays in the center column with real-time updates
7. **Change Format** (optional): Edit format to regenerate bracket with different structure
8. **Real-time Updates**: Bracket updates automatically as matches complete

### Changing Tournament Format

To change the tournament format:
1. Navigate to the Configuration panel (left column)
2. Click "Edit" next to the Format field
3. Select "Single Elimination" or "Double Elimination" from the dropdown
4. Click "Save" to apply changes
5. The tournament bracket will automatically regenerate with the new format
6. All previous match results will be cleared

**Note**: Changing format will reset all match results. Use with caution!

## Double Elimination Grand Finals Reset

In double elimination tournaments, the system automatically handles grand finals reset:

### How It Works

1. **Grand Final Match 1**: Winner's bracket winner (0 losses) vs Loser's bracket winner (1 loss)
   - If winner's bracket winner wins → Tournament complete (champion decided)
   - If loser's bracket winner wins → Both players now have 1 loss → Reset match triggered

2. **Grand Final Reset Match**: Only played if loser's bracket winner wins Match 1
   - Both finalists now have equal losses (1 each)
   - Winner of this match becomes the tournament champion
   - Ensures fairness: both finalists must lose twice to be eliminated

### Bracket Display

- The bracket viewer will automatically display both grand final matches
- Grand Final Match 1 is always shown
- Grand Final Reset (Match 2) appears only after Match 1 is won by loser's bracket winner
- Once Match 1 is completed, Match 2 becomes playable if reset is triggered

### Configuration

The grand finals reset is automatically enabled for all double elimination tournaments:
- Setting: `grandFinal: 'double'` in brackets-manager.js
- Cannot be disabled (ensures tournament integrity)
- Follows standard double elimination rules used in competitive gaming

## Database Integration

### Required Fields in `tournaments` table:
- `id`: Tournament UUID
- `name`: Tournament name
- `event_id`: Associated event
- `tournament_type`: Tournament format (`single_elimination` or `double_elimination`)
- `bracket_data`: JSONB column storing complete bracket state
- `status`: Tournament status (`waiting_for_participants`, `active`, etc.)
- `max_participants`: Maximum allowed participants
- `min_participants`: Minimum required participants

### Data Flow:
- **Participants**: Fetched from `rsvps` table where `status = 'going'`
- **Tournament Info**: Loaded from `tournaments` table
- **Bracket State**: Stored in `bracket_data` JSONB column
- **Real-time Sync**: All changes persisted immediately

### Format Storage:
The `tournament_type` field determines the tournament structure:
- Default: `single_elimination`
- Options: `single_elimination`, `double_elimination`
- Changing format triggers automatic bracket regeneration

This implementation provides a complete tournament management system with both single and double elimination formats, real-time bracket visualization, and seamless database integration.
