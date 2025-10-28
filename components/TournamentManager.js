import { useState, useEffect } from 'react';
import tournamentManager from '../lib/tournamentManager';
import styles from './TournamentManager.module.css';

export default function TournamentManager({ tournamentId }) {
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
    <div className={styles.tournamentManager}>
      <div className={styles.participantsSection}>
        <h3>Participants ({participants.length})</h3>
        <div className={styles.participantsList}>
          {participants.map(participant => (
            <div key={participant.id} className={styles.participantItem}>
              {participant.name}
            </div>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className={styles.createTournament}>
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
        <div className={styles.matchesSection}>
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
    <div className={styles.matchCard}>
      <div className={styles.participants}>
        <span>{match.opponent1?.name || 'TBD'}</span>
        <span>vs</span>
        <span>{match.opponent2?.name || 'TBD'}</span>
      </div>
      
      {match.status === 'ready' && (
        <div className={styles.scoreInput}>
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
        <div className={styles.matchResult}>
          {match.opponent1.name}: {match.opponent1.score} - {match.opponent2.score} :{match.opponent2.name}
        </div>
      )}
    </div>
  );
}
