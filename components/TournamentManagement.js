import { useState, useEffect } from 'react';
import tournamentManager from '../lib/tournamentManager';
import styles from './TournamentManagement.module.css';

// Helper function to check if a number is a power of 2
function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

// Helper function to calculate BYE count
function getByeCount(participantCount) {
  if (participantCount < 2) return 0;
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(participantCount)));
  return nextPowerOfTwo - participantCount;
}

export default function TournamentManagement({ tournamentId }) {
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // First check if tournament needs to be regenerated
      await tournamentManager.checkAndRegenerateTournament(tournamentId);
      
      const [participantsData, currentMatches] = await Promise.all([
        tournamentManager.getParticipants(tournamentId),
        tournamentManager.getCurrentMatches(tournamentId)
      ]);
      
      setParticipants(participantsData);
      setMatches(currentMatches || []);
    } catch (err) {
      console.error('Error loading tournament data:', err);
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
        {participants.length > 0 && !isPowerOfTwo(participants.length) && (
          <div className={styles.byeInfo}>
            <strong>BYE Information:</strong> With {participants.length} participants, 
            {getByeCount(participants.length)} BYE slot(s) will be added to create a balanced bracket.
            <br />
            <small>Tournament will have {Math.pow(2, Math.ceil(Math.log2(participants.length)))} total slots.</small>
          </div>
        )}
        <div className={styles.participantsList}>
          {participants.map(participant => (
            <div key={participant.id} className={`${styles.participantItem} ${participant.isHost ? styles.hostParticipant : ''}`}>
              {participant.name}
              {participant.isHost && <span className={styles.hostBadge}>Host</span>}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.matchesSection}>
        <h3>Current Matches</h3>
        {matches.length === 0 ? (
          <div className={styles.noMatches}>
            <p>No matches available yet.</p>
            {participants.length < 2 ? (
              <div>
                <p className={styles.warning}>
                  <strong>Waiting for participants:</strong> Need at least 2 participants to generate matches.
                </p>
                <p className={styles.info}>
                  Matches will be automatically generated when enough participants RSVP to the event.
                </p>
              </div>
            ) : (
              <p className={styles.info}>
                Tournament bracket will be generated automatically.
              </p>
            )}
          </div>
        ) : (
          matches.map(match => (
            <MatchCard 
              key={match.id} 
              match={match} 
              onUpdate={updateMatchResult}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, onUpdate }) {
  const [opponent1Score, setOpponent1Score] = useState('');
  const [opponent2Score, setOpponent2Score] = useState('');

  // Check if this is a BYE match (one opponent is null/undefined)
  const isByeMatch = !match.opponent1 || !match.opponent2;
  const hasByeOpponent = !match.opponent1 || !match.opponent2;
  const byeOpponent = !match.opponent1 ? match.opponent2 : match.opponent1;

  const handleSubmit = () => {
    if (opponent1Score && opponent2Score) {
      onUpdate(match.id, parseInt(opponent1Score), parseInt(opponent2Score));
      setOpponent1Score('');
      setOpponent2Score('');
    }
  };

  const handleByeAdvance = () => {
    // For BYE matches, automatically advance the non-BYE opponent
    if (hasByeOpponent && byeOpponent) {
      onUpdate(match.id, 1, 0); // Give the real opponent a win
    }
  };

  return (
    <div className={`${styles.matchCard} ${isByeMatch ? styles.byeMatch : ''}`}>
      <div className={styles.participants}>
        <span className={!match.opponent1 ? styles.byeOpponent : ''}>
          {match.opponent1?.name || 'BYE'}
        </span>
        <span>vs</span>
        <span className={!match.opponent2 ? styles.byeOpponent : ''}>
          {match.opponent2?.name || 'BYE'}
        </span>
      </div>
      
      {match.status === 'ready' && (
        <div className={styles.matchActions}>
          {isByeMatch ? (
            <div className={styles.byeActions}>
              <div className={styles.byeInfo}>
                {byeOpponent?.name} advances automatically
              </div>
              <button 
                className={styles.byeButton}
                onClick={handleByeAdvance}
              >
                Advance {byeOpponent?.name}
              </button>
            </div>
          ) : (
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
        </div>
      )}
      
      {match.status === 'completed' && (
        <div className={styles.matchResult}>
          {isByeMatch ? (
            <div className={styles.byeResult}>
              {byeOpponent?.name} advanced (BYE)
            </div>
          ) : (
            <div>
              {match.opponent1.name}: {match.opponent1.score} - {match.opponent2.score} :{match.opponent2.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
