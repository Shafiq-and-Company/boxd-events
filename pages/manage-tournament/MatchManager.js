import { useState, useEffect } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './tournament.module.css';

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

export default function MatchManager({ tournamentId, onMatchUpdate }) {
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [bracketData, setBracketData] = useState(null);
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
      
      const [participantsData, currentMatches, fullBracketData] = await Promise.all([
        tournamentManager.getParticipants(tournamentId),
        tournamentManager.getCurrentMatches(tournamentId),
        tournamentManager.getBracketData(tournamentId)
      ]);
      
      setParticipants(participantsData);
      setMatches(currentMatches || []);
      setBracketData(fullBracketData);
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
      // Notify parent component to refresh bracket
      if (onMatchUpdate) {
        onMatchUpdate();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Helper function to get bracket and round information
  const getMatchContext = (match) => {
    if (!bracketData || !bracketData.group || !bracketData.round) {
      return { bracketName: '', roundName: '', isGrandFinal: false };
    }

    const group = bracketData.group.find(g => g.id === match.group_id);
    const round = bracketData.round.find(r => r.id === match.round_id);
    
    if (!group || !round) {
      return { bracketName: '', roundName: '', isGrandFinal: false };
    }

    // Determine bracket type
    let bracketName = '';
    let isGrandFinal = false;
    
    // For double elimination, groups have specific numbers
    // Group 1 = Winner's Bracket, Group 2 = Loser's Bracket, Group 3 = Grand Finals
    if (group.number === 1) {
      bracketName = "Winner's Bracket";
    } else if (group.number === 2) {
      bracketName = "Loser's Bracket";
    } else if (group.number === 3) {
      bracketName = "Grand Finals";
      isGrandFinal = true;
    }

    // Get round name
    const roundName = round.number ? `Round ${round.number}` : '';

    return { bracketName, roundName, isGrandFinal };
  };

  if (loading) return <div>Loading tournament...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
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
        matches.map(match => {
          const context = getMatchContext(match);
          return (
            <MatchCard 
              key={match.id} 
              match={match} 
              onUpdate={updateMatchResult}
              bracketName={context.bracketName}
              roundName={context.roundName}
              isGrandFinal={context.isGrandFinal}
            />
          );
        })
      )}
    </div>
  );
}

function MatchCard({ match, onUpdate, bracketName, roundName, isGrandFinal }) {
  const [opponent1Score, setOpponent1Score] = useState('');
  const [opponent2Score, setOpponent2Score] = useState('');
  const [inputMode, setInputMode] = useState('winner'); // 'winner' or 'score'

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

  const handleSetWinner = (winnerOpponent) => {
    // Set winner with default score (1-0 for simplicity)
    if (winnerOpponent === 1) {
      onUpdate(match.id, 1, 0);
    } else if (winnerOpponent === 2) {
      onUpdate(match.id, 0, 1);
    }
  };

  const handleByeAdvance = () => {
    // For BYE matches, automatically advance the non-BYE opponent
    if (hasByeOpponent && byeOpponent) {
      onUpdate(match.id, 1, 0); // Give the real opponent a win
    }
  };

  return (
    <div className={`${styles.matchCard} ${isByeMatch ? styles.byeMatch : ''} ${isGrandFinal ? styles.grandFinalMatch : ''}`}>
      {/* Bracket Context Header */}
      {(bracketName || roundName) && (
        <div className={`${styles.matchHeader} ${isGrandFinal ? styles.grandFinalHeader : ''}`}>
          {bracketName && <span className={styles.bracketLabel}>{bracketName}</span>}
          {bracketName && roundName && <span className={styles.headerDivider}>•</span>}
          {roundName && <span className={styles.roundLabel}>{roundName}</span>}
        </div>
      )}

      {(match.status === 2 || match.status === 3) && (
        <>
          {isByeMatch ? (
            <div className={styles.matchRow}>
              <span 
                className={styles.playerNameClickable}
                onClick={handleByeAdvance}
                title="Click to advance"
              >
                {byeOpponent?.name}
              </span>
              <span className={styles.vsText}>advances</span>
            </div>
          ) : (
            <>
              <div className={styles.matchRow}>
                <div className={styles.playerColumn}>
                  <span 
                    className={styles.playerNameClickable}
                    onClick={() => handleSetWinner(1)}
                  >
                    {match.opponent1?.name || 'TBD'}
                    <span className={styles.hintText}>click to win</span>
                  </span>
                  {inputMode === 'score' && (
                    <input 
                      type="number" 
                      className={styles.scoreInputCompact}
                      placeholder="0"
                      value={opponent1Score}
                      onChange={(e) => setOpponent1Score(e.target.value)}
                    />
                  )}
                </div>
                <span className={styles.vsText}>vs</span>
                <div className={styles.playerColumn}>
                  <span 
                    className={styles.playerNameClickable}
                    onClick={() => handleSetWinner(2)}
                  >
                    {match.opponent2?.name || 'TBD'}
                    <span className={styles.hintText}>click to win</span>
                  </span>
                  {inputMode === 'score' && (
                    <input 
                      type="number" 
                      className={styles.scoreInputCompact}
                      placeholder="0"
                      value={opponent2Score}
                      onChange={(e) => setOpponent2Score(e.target.value)}
                    />
                  )}
                </div>
                <div className={styles.matchActions}>
                  <button 
                    className={styles.modeToggleButton}
                    onClick={() => setInputMode(inputMode === 'score' ? 'winner' : 'score')}
                    title={inputMode === 'score' ? 'Hide score entry' : 'Enter exact scores'}
                  >
                    {inputMode === 'score' ? '×' : '⋯'}
                  </button>
                  {inputMode === 'score' && (
                    <button 
                      className={styles.submitScoreButton}
                      onClick={handleSubmit}
                      disabled={!opponent1Score || !opponent2Score}
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
      
      {match.status === 4 && (
        <div className={styles.matchRow}>
          <span className={styles.playerName}>
            {match.opponent1?.name || 'BYE'}
          </span>
          <span className={styles.scoreDisplay}>
            {match.opponent1?.score || 0}
          </span>
          <span className={styles.vsText}>-</span>
          <span className={styles.scoreDisplay}>
            {match.opponent2?.score || 0}
          </span>
          <span className={styles.playerName}>
            {match.opponent2?.name || 'BYE'}
          </span>
          <span className={styles.winnerBadge}>
            {match.opponent1?.result === 'win' ? '✓' : '✓'}
          </span>
        </div>
      )}
    </div>
  );
}
