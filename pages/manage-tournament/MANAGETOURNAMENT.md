# Tournament Management Integration Guide

## Overview
This guide provides step-by-step instructions for integrating [brackets-manager.js](https://github.com/Drarig29/brackets-manager.js) into the tournament management system.

## Library Features
- **Tournament Types**: Single elimination, double elimination, round-robin
- **BYE Support**: Automatic seeding and balancing
- **Match Management**: Locked, waiting, ready, running, completed, archived states
- **Multi-Stage**: Support for multiple tournament stages (e.g., round-robin → elimination)
- **Storage Agnostic**: Works with JSON, SQL, Redis, and more

## Current Setup Status
✅ **Already Installed**:
- `brackets-manager` (v1.7.1)
- `brackets-viewer` (v1.8.1) 
- `brackets-memory-db` (v1.0.5)

✅ **Database Schema**: Ready with `bracket_data` JSONB column

## Integration Steps

### Step 1: Create Tournament Manager Service
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

  // Create tournament stage
  async createStage(tournamentData) {
    const { tournamentId, name, type, seeding, settings } = tournamentData;
    
    const stage = await this.manager.create.stage({
      tournamentId,
      name,
      type, // 'single_elimination', 'double_elimination', 'round_robin'
      seeding,
      settings: settings || {}
    });

    // Save to database
    await this.saveToDatabase(tournamentId, stage);
    return stage;
  }

  // Update match results
  async updateMatch(matchId, opponent1, opponent2) {
    const match = await this.manager.update.match({
      id: matchId,
      opponent1,
      opponent2
    });

    // Save updated bracket to database
    await this.saveToDatabase(match.tournamentId, match);
    return match;
  }

  // Get tournament data
  async getTournament(tournamentId) {
    return await this.manager.get.tournament(tournamentId);
  }

  // Get current matches
  async getCurrentMatches(tournamentId) {
    return await this.manager.get.currentMatches(tournamentId);
  }

  // Save bracket data to Supabase
  async saveToDatabase(tournamentId, bracketData) {
    const { error } = await supabase
      .from('tournaments')
      .update({ bracket_data: bracketData })
      .eq('id', tournamentId);

    if (error) throw error;
  }

  // Load bracket data from Supabase
  async loadFromDatabase(tournamentId) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('bracket_data')
      .eq('id', tournamentId)
      .single();

    if (error) throw error;
    return data.bracket_data;
  }
}

export default new TournamentManager();
```

### Step 2: Create Tournament Management Component
Create `/components/TournamentManager.js`:

```javascript
import { useState, useEffect } from 'react';
import tournamentManager from '../lib/tournamentManager';

export default function TournamentManager({ tournamentId }) {
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournament();
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      const tournamentData = await tournamentManager.getTournament(tournamentId);
      const currentMatches = await tournamentManager.getCurrentMatches(tournamentId);
      
      setTournament(tournamentData);
      setMatches(currentMatches);
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMatchResult = async (matchId, opponent1Score, opponent2Score) => {
    try {
      await tournamentManager.updateMatch(matchId, {
        score: opponent1Score,
        result: opponent1Score > opponent2Score ? 'win' : 'loss'
      }, {
        score: opponent2Score,
        result: opponent2Score > opponent1Score ? 'win' : 'loss'
      });
      
      // Reload tournament data
      await loadTournament();
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  if (loading) return <div>Loading tournament...</div>;

  return (
    <div className="tournament-manager">
      <h2>{tournament?.name}</h2>
      
      <div className="matches-section">
        <h3>Current Matches</h3>
        {matches.map(match => (
          <div key={match.id} className="match-card">
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
                  onChange={(e) => setOpponent1Score(e.target.value)}
                />
                <input 
                  type="number" 
                  placeholder="Score 2"
                  onChange={(e) => setOpponent2Score(e.target.value)}
                />
                <button 
                  onClick={() => updateMatchResult(match.id, opponent1Score, opponent2Score)}
                >
                  Submit Result
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Create Tournament Bracket Viewer
Create `/components/TournamentBracket.js`:

```javascript
import { useEffect, useRef } from 'react';
import { BracketsViewer } from 'brackets-viewer';

export default function TournamentBracket({ tournamentData }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (tournamentData && containerRef.current) {
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
      viewerRef.current.render(tournamentData);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [tournamentData]);

  return (
    <div className="tournament-bracket">
      <div ref={containerRef} className="bracket-container"></div>
    </div>
  );
}
```

### Step 4: Update Main Tournament Page
Update `/pages/manage-tournament/[id].js`:

```javascript
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TournamentManager from '../../components/TournamentManager';
import TournamentBracket from '../../components/TournamentBracket';
import tournamentManager from '../../lib/tournamentManager';

export default function ManageTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('manage');

  useEffect(() => {
    if (id) {
      loadTournament();
    }
  }, [id]);

  const loadTournament = async () => {
    try {
      const tournamentData = await tournamentManager.getTournament(id);
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error loading tournament:', error);
    }
  };

  const createTournamentStage = async (stageData) => {
    try {
      await tournamentManager.createStage({
        tournamentId: id,
        ...stageData
      });
      await loadTournament();
    } catch (error) {
      console.error('Error creating stage:', error);
    }
  };

  return (
    <div className="manage-tournament">
      <h1>Manage Tournament</h1>
      
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
        <TournamentManager tournamentId={id} />
      )}

      {activeTab === 'bracket' && tournament && (
        <TournamentBracket tournamentData={tournament} />
      )}
    </div>
  );
}
```

### Step 5: Add CSS Styles
Create `/components/TournamentManager.module.css`:

```css
.tournament-manager {
  padding: 20px;
}

.match-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  background: #f9f9f9;
}

.participants {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
}

.score-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.score-input input {
  width: 80px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.score-input button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.score-input button:hover {
  background: #0056b3;
}

.bracket-container {
  width: 100%;
  overflow-x: auto;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  margin-right: 5px;
}

.tabs button.active {
  background: #007bff;
  color: white;
}
```

## Usage Examples

### Creating a Single Elimination Tournament
```javascript
const stageData = {
  name: 'Main Tournament',
  type: 'single_elimination',
  seeding: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  settings: {}
};

await tournamentManager.createStage(stageData);
```

### Creating a Double Elimination Tournament
```javascript
const stageData = {
  name: 'Double Elimination Tournament',
  type: 'double_elimination',
  seeding: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
  settings: { grandFinal: 'double' }
};

await tournamentManager.createStage(stageData);
```

### Updating Match Results
```javascript
await tournamentManager.updateMatch(matchId, {
  score: 16,
  result: 'win'
}, {
  score: 12,
  result: 'loss'
});
```

## Key Benefits
- **Automatic Bracket Generation**: Handles seeding, BYEs, and bracket structure
- **Real-time Updates**: Live bracket updates as matches complete
- **Multiple Formats**: Support for all major tournament types
- **Visual Display**: Built-in bracket visualization with brackets-viewer
- **Database Integration**: Seamless Supabase integration

## Next Steps
1. Implement the components above
2. Add tournament creation wizard
3. Add participant management
4. Add tournament settings configuration
5. Add match scheduling features
