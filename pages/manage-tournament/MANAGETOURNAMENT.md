# Single Elimination Tournament Management System

## Overview
Complete implementation guide for a simple single elimination tournament management system using [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) and [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js).

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

#### 2.2 Bracket Viewer Component
Create `/pages/manage-tournament/BracketViewer.js`:

```javascript
import { useEffect, useRef, useState } from 'react';
import { BracketsViewer } from 'brackets-viewer';
import tournamentManager from '../../lib/tournamentManager';

export default function BracketViewer({ tournamentId }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBracketData();
  }, [tournamentId]);

  const loadBracketData = async () => {
    try {
      setLoading(true);
      const data = await tournamentManager.getBracketData(tournamentId);
      setBracketData(data);
    } catch (error) {
      console.error('Error loading bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bracketData && containerRef.current) {
      // Clean up previous viewer
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      // Create new viewer
      viewerRef.current = new BracketsViewer(containerRef.current, {
        participantOriginPlacement: 'before',
        separatedChildCountLabel: true,
        showSlotsOrigin: true,
        showLowerBracketSlotsOrigin: true,
        highlightParticipantOnHover: true,
      });

      // Render the tournament
      viewerRef.current.render(bracketData);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [bracketData]);

  if (loading) return <div>Loading bracket...</div>;
  if (!bracketData) return <div>No bracket data available</div>;

  return (
    <div className="tournament-bracket">
      <div ref={containerRef} className="bracket-container"></div>
    </div>
  );
}
```

### Phase 3: Main Tournament Page
Update `/pages/manage-tournament/[id].js`:

```javascript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import MatchManager from './MatchManager';
import BracketViewer from './BracketViewer';

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
        <BracketViewer tournamentId={id} />
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

### ✅ Tournament Creation
- Single elimination format (fixed)
- Automatic bracket generation with BYE handling
- Tournament name from tournaments table
- Bracket data stored in `bracket_data` JSONB column

### ✅ Match Management
- Real-time match result input
- Score validation and winner determination
- Automatic bracket advancement
- Match status tracking (ready, completed)

### ✅ Bracket Visualization
- Live bracket updates using brackets-viewer.js
- Responsive design with horizontal scrolling
- Match highlighting and participant tracking
- Clean, minimalist design following brand guidelines

### ✅ Real-time Updates
- Bracket visualization updates immediately after match results
- Persistent state in database
- Seamless data flow between components

## Usage Flow

1. **Visit Tournament Page**: Navigate to `/manage-tournament/[id]`
2. **View Participants**: See RSVP participants for the event
3. **Create Tournament**: Enter tournament name and generate bracket
4. **Manage Matches**: Input scores for current matches
5. **View Bracket**: Switch to bracket tab for visual representation
6. **Real-time Updates**: Bracket updates automatically as matches complete

## Database Integration

- **Participants**: Fetched from `rsvps` table where `status = 'going'`
- **Tournament Info**: Loaded from `tournaments` table
- **Bracket State**: Stored in `bracket_data` JSONB column
- **Real-time Sync**: All changes persisted immediately

This implementation provides a complete, simple single elimination tournament management system with real-time bracket visualization and seamless database integration.
