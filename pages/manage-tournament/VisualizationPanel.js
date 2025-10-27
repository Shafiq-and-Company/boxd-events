import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './VisualizationPanel.module.css';

const VisualizationPanel = ({ eventData, participants, refreshTrigger }) => {
  const [bracketData, setBracketData] = useState(null);
  const [tournamentType, setTournamentType] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch bracket data from tournaments table
  const fetchBracketData = async () => {
    if (!eventData?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('bracket_data, tournament_type')
        .eq('event_id', eventData.id)
        .single();

      if (error) throw error;
      setBracketData(data?.bracket_data || null);
      setTournamentType(data?.tournament_type || 'single_elimination');
    } catch (err) {
      console.error('Error fetching bracket data:', err);
      setBracketData(null);
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle refresh trigger changes (including format changes)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('VisualizationPanel refreshing due to format change or other trigger');
      fetchBracketData();
    }
  }, [refreshTrigger, eventData?.id]);

  // Initial fetch when component mounts
  useEffect(() => {
    fetchBracketData();
  }, [eventData?.id]);

  const getParticipantInfo = (player) => {
    if (!player) return null;
    
    // player could be an object with id property, or just an id string
    const playerId = typeof player === 'string' ? player : player?.id;
    if (!playerId) return null;
    
    const participant = participants.find(p => p.user_id === playerId);
    if (!participant) return null;
    
    return {
      username: participant.users?.username || 'Unknown',
      firstName: participant.users?.first_name || '',
      lastName: participant.users?.last_name || '',
    };
  };

  const renderMatch = (match, index) => {
    const player1Info = getParticipantInfo(match.player1);
    const player2Info = getParticipantInfo(match.player2);
    const player1Id = match.player1?.id || match.player1;
    const player2Id = match.player2?.id || match.player2;
    const isPlayer1Winner = match.winner && (player1Id === match.winner || match.player1?.id === match.winner);
    const isPlayer2Winner = match.winner && (player2Id === match.winner || match.player2?.id === match.winner);

    return (
      <div key={match.matchId || index} className={styles.match}>
        <div className={styles.matchSlot}>
          {player1Info ? (
            <div className={`${styles.player} ${isPlayer1Winner ? styles.winner : ''}`}>
              <span className={styles.username}>{player1Info.username}</span>
              {(player1Info.firstName || player1Info.lastName) && (
                <span className={styles.fullName}>
                  {`${player1Info.firstName} ${player1Info.lastName}`.trim()}
                </span>
              )}
            </div>
          ) : (
            <div className={styles.playerEmpty}>—</div>
          )}
        </div>
        <div className={styles.matchSlot}>
          {player2Info ? (
            <div className={`${styles.player} ${isPlayer2Winner ? styles.winner : ''}`}>
              <span className={styles.username}>{player2Info.username}</span>
              {(player2Info.firstName || player2Info.lastName) && (
                <span className={styles.fullName}>
                  {`${player2Info.firstName} ${player2Info.lastName}`.trim()}
                </span>
              )}
            </div>
          ) : (
            <div className={styles.playerEmpty}>—</div>
          )}
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    if (!bracketData || !bracketData.rounds) return null;

    // Group rounds by bracket type for double elimination
    const isDoubleElimination = tournamentType === 'double_elimination';
    
    if (isDoubleElimination) {
      // Separate winners, losers, and grand finals
      const winnersRounds = bracketData.rounds.filter(r => r.bracket === 'winners' || !r.bracket);
      const losersRounds = bracketData.rounds.filter(r => r.bracket === 'losers');
      const grandFinals = bracketData.rounds.filter(r => r.bracket === 'grand_finals');

      return (
        <div className={styles.doubleEliminationBracket}>
          {/* Winners Bracket */}
          <div className={styles.bracketGroup}>
            <div className={styles.bracketGroupLabel}>Winners Bracket</div>
            <div className={styles.roundsGroup}>
              {winnersRounds.map((round, idx) => (
                <div key={`winners-${idx}`} className={styles.round}>
                  <div className={styles.roundHeader}>{round.name || `Round ${round.roundNumber}`}</div>
                  <div className={styles.matchesContainer}>
                    {round.matches && round.matches.length > 0 ? (
                      round.matches.map((match, matchIndex) => renderMatch(match, matchIndex))
                    ) : (
                      <div className={styles.noMatches}>No matches</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Finals */}
          {grandFinals.length > 0 && (
            <div className={styles.bracketGroup}>
              <div className={styles.bracketGroupLabel}>Grand Finals</div>
              <div className={styles.roundsGroup}>
                {grandFinals.map((round, idx) => {
                  // Label additional grand finals matches as "If Necessary"
                  const roundName = round.name || (idx === 0 ? 'Grand Finals' : 'Grand Finals (If Necessary)');
                  
                  return (
                    <div key={`grand-${idx}`} className={styles.round}>
                      <div className={styles.roundHeader}>{roundName}</div>
                      <div className={styles.matchesContainer}>
                        {round.matches && round.matches.length > 0 ? (
                          round.matches.map((match, matchIndex) => renderMatch(match, matchIndex))
                        ) : (
                          <div className={styles.noMatches}>No matches</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Losers Bracket */}
          {losersRounds.length > 0 && (
            <div className={styles.bracketGroup}>
              <div className={styles.bracketGroupLabel}>Losers Bracket</div>
              <div className={styles.roundsGroup}>
                {losersRounds.map((round, idx) => (
                  <div key={`losers-${idx}`} className={styles.round}>
                    <div className={styles.roundHeader}>{round.name || `Round ${round.roundNumber}`}</div>
                    <div className={styles.matchesContainer}>
                      {round.matches && round.matches.length > 0 ? (
                        round.matches.map((match, matchIndex) => renderMatch(match, matchIndex))
                      ) : (
                        <div className={styles.noMatches}>No matches</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Single elimination, round robin, swiss - render normally
    return (
      <div className={styles.bracket}>
        {bracketData.rounds.map((round, roundIndex) => (
          <div key={roundIndex} className={styles.round}>
            <div className={styles.roundHeader}>{round.name || `Round ${round.roundNumber}`}</div>
            <div className={styles.matchesContainer}>
              {round.matches && round.matches.length > 0 ? (
                round.matches.map((match, matchIndex) => renderMatch(match, matchIndex))
              ) : (
                <div className={styles.noMatches}>No matches</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.visualizationPanel}>
      <div className={styles.panelContent}>
        <h2 className={styles.panelTitle}>Tournament Bracket</h2>
        <div className={styles.bracketContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <p className={styles.loadingText}>Loading bracket data...</p>
            </div>
          ) : bracketData ? (
            <div className={styles.bracketWrapper}>
              {renderBracket()}
            </div>
          ) : (
            <div className={styles.placeholderContainer}>
              <p className={styles.placeholderText}>
                No bracket data available
              </p>
              {participants.length > 0 && (
                <p className={styles.participantCount}>
                  {participants.length} participants registered
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel;
