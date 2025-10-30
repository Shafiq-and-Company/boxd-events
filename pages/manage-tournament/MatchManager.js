import { useState, useEffect } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './matchManager.module.css';

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
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'winners', 'losers', 'finals'

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

  if (loading) return (
    <div className={styles.loading}>
      <img src="/dance-duck.gif" alt="Loading..." />
    </div>
  );
  if (error) return <div>Error: {error}</div>;

  // Detect if double elimination (has multiple groups)
  const isDoubleElimination = bracketData && bracketData.group && bracketData.group.length > 1;

  // Filter matches based on active tab
  const getFilteredMatches = () => {
    if (!isDoubleElimination || activeTab === 'all') {
      return matches;
    }

    return matches.filter(match => {
      const group = bracketData.group.find(g => g.id === match.group_id);
      if (!group) return false;

      if (activeTab === 'winners') return group.number === 1;
      if (activeTab === 'losers') return group.number === 2;
      if (activeTab === 'finals') return group.number === 3;
      return true;
    });
  };

  const filteredMatches = getFilteredMatches();

  // Create participant lookup map
  const participantMap = {};
  participants.forEach(p => {
    participantMap[p.name] = p;
  });

  // Count matches per bracket for tab badges
  const getMatchCount = (tabName) => {
    if (tabName === 'all') return matches.length;
    
    return matches.filter(match => {
      const group = bracketData.group.find(g => g.id === match.group_id);
      if (!group) return false;
      
      if (tabName === 'winners') return group.number === 1;
      if (tabName === 'losers') return group.number === 2;
      if (tabName === 'finals') return group.number === 3;
      return false;
    }).length;
  };

  return (
    <div>
      {matches.length === 0 ? (
        <>
          <div className={styles.matchManagerHeader}>
            <h2 className={styles.matchManagerTitle}>Scorecard</h2>
          </div>
          <div className={styles.noMatches}>
            <img src="/dance-duck.gif" alt="Waiting..." />
            {participants.length < 2 ? (
              <p className={styles.explanation}>
                We need at least 2 people signed up before we can start matches.
              </p>
            ) : (
              <p className={styles.explanation}>
                Matches will show up here once the tournament starts.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.matchManagerHeader}>
            <h2 className={styles.matchManagerTitle}>Scorecard</h2>
            {isDoubleElimination && (
              <div className={styles.bracketTabs}>
                <button 
                  className={`${styles.bracketTab} ${activeTab === 'all' ? styles.bracketTabActive : ''}`}
                  onClick={() => setActiveTab('all')}
                  title="All Brackets"
                >
                  A <span className={styles.tabBadge}>{getMatchCount('all')}</span>
                </button>
                <button 
                  className={`${styles.bracketTab} ${activeTab === 'winners' ? styles.bracketTabActive : ''}`}
                  onClick={() => setActiveTab('winners')}
                  title="Winner's Bracket"
                >
                  W <span className={styles.tabBadge}>{getMatchCount('winners')}</span>
                </button>
                <button 
                  className={`${styles.bracketTab} ${activeTab === 'losers' ? styles.bracketTabActive : ''}`}
                  onClick={() => setActiveTab('losers')}
                  title="Loser's Bracket"
                >
                  L <span className={styles.tabBadge}>{getMatchCount('losers')}</span>
                </button>
                {getMatchCount('finals') > 0 && (
                  <button 
                    className={`${styles.bracketTab} ${activeTab === 'finals' ? styles.bracketTabActive : ''}`}
                    onClick={() => setActiveTab('finals')}
                    title="Grand Finals"
                  >
                    F <span className={styles.tabBadge}>{getMatchCount('finals')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          
          {filteredMatches.length === 0 ? (
            <div className={styles.noMatches}>
              <img src="/dance-duck.gif" alt="Waiting..." />
              <p>Still waiting for matches in this bracket.</p>
              <p className={styles.explanation}>
                Check back later or play matches in other brackets first.
              </p>
            </div>
          ) : (
            filteredMatches.map(match => {
              const context = getMatchContext(match);
              return (
                <MatchCard 
                  key={match.id} 
                  match={match} 
                  onUpdate={updateMatchResult}
                  bracketName={context.bracketName}
                  roundName={context.roundName}
                  isGrandFinal={context.isGrandFinal}
                  participantMap={participantMap}
                />
              );
            })
          )}
        </>
      )}
    </div>
  );
}

function MatchCard({ match, onUpdate, bracketName, roundName, isGrandFinal, participantMap }) {
  const [opponent1Score, setOpponent1Score] = useState('');
  const [opponent2Score, setOpponent2Score] = useState('');
  const [inputMode, setInputMode] = useState('winner'); // 'winner' or 'score'

  // Check if this is a BYE match (one opponent is null/undefined)
  const isByeMatch = !match.opponent1 || !match.opponent2;
  const hasByeOpponent = !match.opponent1 || !match.opponent2;
  const byeOpponent = !match.opponent1 ? match.opponent2 : match.opponent1;

  // Get participant details
  const getParticipantDetails = (opponentName) => {
    if (!opponentName || opponentName === 'TBD' || opponentName === 'BYE') return null;
    return participantMap[opponentName];
  };

  const opponent1Details = getParticipantDetails(match.opponent1?.name);
  const opponent2Details = getParticipantDetails(match.opponent2?.name);

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
                <span className={styles.playerUsername}>{byeOpponent?.name}</span>
                {getParticipantDetails(byeOpponent?.name) && (getParticipantDetails(byeOpponent?.name).firstName || getParticipantDetails(byeOpponent?.name).lastName) && (
                  <span className={styles.playerRealName}>
                    {getParticipantDetails(byeOpponent?.name).firstName} {getParticipantDetails(byeOpponent?.name).lastName}
                  </span>
                )}
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
                    <span className={styles.playerUsername}>{match.opponent1?.name || 'TBD'}</span>
                    {opponent1Details && (opponent1Details.firstName || opponent1Details.lastName) && (
                      <span className={styles.playerRealName}>
                        {opponent1Details.firstName} {opponent1Details.lastName}
                      </span>
                    )}
                    <span className={styles.hintText}>click name to pick winner</span>
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
                    <span className={styles.playerUsername}>{match.opponent2?.name || 'TBD'}</span>
                    {opponent2Details && (opponent2Details.firstName || opponent2Details.lastName) && (
                      <span className={styles.playerRealName}>
                        {opponent2Details.firstName} {opponent2Details.lastName}
                      </span>
                    )}
                    <span className={styles.hintText}>click name to pick winner</span>
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
          <div className={styles.playerColumn}>
            <span className={styles.playerUsername}>{match.opponent1?.name || 'BYE'}</span>
            {opponent1Details && (opponent1Details.firstName || opponent1Details.lastName) && (
              <span className={styles.playerRealName}>
                {opponent1Details.firstName} {opponent1Details.lastName}
              </span>
            )}
          </div>
          <span className={styles.scoreDisplay}>
            {match.opponent1?.score || 0}
          </span>
          <span className={styles.vsText}>-</span>
          <span className={styles.scoreDisplay}>
            {match.opponent2?.score || 0}
          </span>
          <div className={styles.playerColumn}>
            <span className={styles.playerUsername}>{match.opponent2?.name || 'BYE'}</span>
            {opponent2Details && (opponent2Details.firstName || opponent2Details.lastName) && (
              <span className={styles.playerRealName}>
                {opponent2Details.firstName} {opponent2Details.lastName}
              </span>
            )}
          </div>
          <span className={styles.winnerBadge}>
            {match.opponent1?.result === 'win' ? '✓' : '✓'}
          </span>
        </div>
      )}
    </div>
  );
}
