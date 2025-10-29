import { useEffect, useState } from 'react';
import tournamentManager from '../../lib/tournamentManager';
import styles from './verticalBracket.module.css';

export default function VerticalBracketViewer({ tournamentId }) {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tournamentId) {
      loadBracketData();
    }
  }, [tournamentId]);

  const loadBracketData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentManager.getBracketData(tournamentId);
      
      if (!data) {
        setError('No bracket data available yet.');
        return;
      }
      
      setBracketData(data);
    } catch (err) {
      console.error('Error loading bracket:', err);
      setError('Failed to load bracket data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading bracket...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!bracketData) return <div className={styles.error}>No bracket data available</div>;

  // Organize bracket data
  const { match = [], participant = [], group = [], round = [] } = bracketData;
  
  // Create participant map for quick lookup
  const participantMap = {};
  participant.forEach(p => {
    participantMap[p.id] = p;
  });

  // Group matches by group (Winner's Bracket, Loser's Bracket, Grand Finals)
  const groupMap = {};
  group.forEach(g => {
    groupMap[g.id] = { ...g, rounds: [] };
  });

  // Group rounds by group
  round.forEach(r => {
    if (groupMap[r.group_id]) {
      groupMap[r.group_id].rounds.push({ ...r, matches: [] });
    }
  });

  // Sort rounds by number within each group
  Object.values(groupMap).forEach(g => {
    g.rounds.sort((a, b) => a.number - b.number);
  });

  // Assign matches to rounds
  match.forEach(m => {
    const matchRound = round.find(r => r.id === m.round_id);
    if (matchRound && groupMap[matchRound.group_id]) {
      const groupRounds = groupMap[matchRound.group_id].rounds;
      const targetRound = groupRounds.find(r => r.id === m.round_id);
      if (targetRound) {
        targetRound.matches.push(m);
      }
    }
  });

  // Sort groups for display (Winner's, Loser's, Grand Finals)
  const sortedGroups = Object.values(groupMap).sort((a, b) => a.number - b.number);

  const getGroupName = (groupNumber) => {
    if (groupNumber === 1) return "Winner's Bracket";
    if (groupNumber === 2) return "Loser's Bracket";
    if (groupNumber === 3) return "Grand Finals";
    return `Group ${groupNumber}`;
  };

  const getRoundName = (roundIndex, totalRounds, groupNumber) => {
    // For single elimination or winner's bracket, show traditional names
    if (groupNumber === 1 || sortedGroups.length === 1) {
      if (roundIndex === totalRounds - 1) return 'Finals';
      if (roundIndex === totalRounds - 2) return 'Semifinals';
      if (roundIndex === totalRounds - 3) return 'Quarterfinals';
      return `Round ${roundIndex + 1}`;
    }
    // For loser's bracket or grand finals
    return `Round ${roundIndex + 1}`;
  };

  const getMatchStatusClass = (status) => {
    // Status: 0 = locked, 1 = waiting, 2 = ready, 3 = running, 4 = completed
    if (status === 4) return styles.completed;
    if (status === 2 || status === 3) return styles.ready;
    return styles.locked;
  };

  const getMatchStatusLabel = (status) => {
    if (status === 4) return 'Complete';
    if (status === 2 || status === 3) return 'Active';
    return 'Pending';
  };

  const getWinnerClass = (opponent, match) => {
    if (!opponent || match.status !== 4) return '';
    return opponent.result === 'win' ? styles.winner : styles.loser;
  };

  return (
    <div className={styles.verticalBracket}>
      {sortedGroups.map(group => {
        const groupMatches = group.rounds.reduce((total, round) => total + round.matches.length, 0);
        const groupCompleted = group.rounds.reduce((total, round) => 
          total + round.matches.filter(m => m.status === 4).length, 0
        );
        const groupActive = group.rounds.reduce((total, round) => 
          total + round.matches.filter(m => m.status === 2 || m.status === 3).length, 0
        );

        return (
          <div key={group.id} className={styles.bracketGroup}>
            <div className={styles.groupHeader}>
              <h3 className={styles.groupTitle}>{getGroupName(group.number)}</h3>
              <div className={styles.groupStats}>
                <span className={styles.groupStat}>{groupCompleted}/{groupMatches}</span>
                {groupActive > 0 && (
                  <span className={styles.groupActiveIndicator}>{groupActive} active</span>
                )}
              </div>
            </div>
            
            <div className={styles.roundsContainer}>
              {group.rounds.map((round, roundIndex) => {
                const roundComplete = round.matches.filter(m => m.status === 4).length;
                const roundActive = round.matches.filter(m => m.status === 2 || m.status === 3).length;
                
                return (
                  <div key={round.id} className={styles.roundColumn}>
                    <div className={styles.roundHeader}>
                      <div className={styles.roundTitle}>
                        {getRoundName(roundIndex, group.rounds.length, group.number)}
                      </div>
                      <div className={styles.roundMeta}>
                        <span className={styles.roundProgress}>{roundComplete}/{round.matches.length}</span>
                        {roundActive > 0 && <span className={styles.roundActiveIndicator}>●</span>}
                      </div>
                    </div>
                    
                    <div className={styles.matchesColumn}>
                      {round.matches.map((match) => {
                        const opponent1 = match.opponent1 ? participantMap[match.opponent1.id] : null;
                        const opponent2 = match.opponent2 ? participantMap[match.opponent2.id] : null;
                        const isBye = !opponent1 || !opponent2;
                        
                        return (
                          <div 
                            key={match.id} 
                            className={`${styles.matchCard} ${getMatchStatusClass(match.status)} ${isBye ? styles.byeMatch : ''}`}
                          >
                            <div className={`${styles.opponent} ${getWinnerClass(match.opponent1, match)}`}>
                              <span className={styles.opponentName}>
                                {opponent1?.name || 'BYE'}
                              </span>
                              {match.status === 4 && match.opponent1 && (
                                <span className={styles.score}>
                                  {match.opponent1.score || 0}
                                </span>
                              )}
                            </div>
                            
                            <div className={styles.matchDivider}>
                              {match.status !== 4 && !isBye && (
                                <span className={styles.matchStatus}>
                                  {getMatchStatusLabel(match.status)}
                                </span>
                              )}
                            </div>
                            
                            <div className={`${styles.opponent} ${getWinnerClass(match.opponent2, match)}`}>
                              <span className={styles.opponentName}>
                                {opponent2?.name || 'BYE'}
                              </span>
                              {match.status === 4 && match.opponent2 && (
                                <span className={styles.score}>
                                  {match.opponent2.score || 0}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

