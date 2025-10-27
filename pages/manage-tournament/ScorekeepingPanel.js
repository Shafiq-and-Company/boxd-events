import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { handleMatchCompletion } from '../../lib/singleElimination';
import { handleMatchCompletion as handleDoubleElimination } from '../../lib/doubleElimination';
import { handleMatchCompletion as handleRoundRobin } from '../../lib/roundRobin';
import { handleMatchCompletion as handleSwiss } from '../../lib/swiss';
import styles from './ScorekeepingPanel.module.css';

const ScorekeepingPanel = ({ eventData, participants, onMatchUpdate, isCollapsed }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState({});
  const [tournamentData, setTournamentData] = useState(null);

  const fetchMatches = async () => {
    if (!eventData?.id) return;
    
    setLoading(true);
    try {
      // Fetch tournament data with bracket_data
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournamentData(tournament);

      // Extract matches from bracket_data instead of tournament_matches table
      const matchesFromBracket = [];
      if (tournament?.bracket_data?.rounds) {
        tournament.bracket_data.rounds.forEach(round => {
          if (round.matches) {
            round.matches.forEach(match => {
              matchesFromBracket.push({
                id: match.matchId, // Use matchId as unique identifier
                match_id: match.matchId,
                round_number: round.roundNumber,
                player1_id: match.player1?.id || null,
                player2_id: match.player2?.id || null,
                winner_id: match.winner || null,
                status: match.status || 'scheduled',
                bracket: round.bracket || 'main',
                round_name: round.name
              });
            });
          }
        });
      }

      setMatches(matchesFromBracket);

      // Set selected winners from bracket data
      const winners = {};
      matchesFromBracket.forEach(match => {
        if (match.winner_id) {
          winners[match.id] = match.winner_id;
        }
      });
      setSelectedWinners(winners);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCollapsed && eventData) {
      fetchMatches();
    }
  }, [eventData, isCollapsed, onMatchUpdate]);

  const getParticipantInfo = (playerId) => {
    if (!playerId) return null;
    const participant = participants.find(p => p.user_id === playerId);
    if (!participant) return null;
    
    return {
      id: playerId,
      username: participant.users?.username || 'Unknown',
      firstName: participant.users?.first_name || '',
      lastName: participant.users?.last_name || ''
    };
  };

  const handleWinnerSelect = (matchId, playerId) => {
    setSelectedWinners(prev => ({
      ...prev,
      [matchId]: playerId
    }));
  };

  const handleLockIn = async (match) => {
    if (!selectedWinners[match.id]) {
      alert('Please select a winner before locking in the result.');
      return;
    }

    try {
      setLoading(true);
      const winnerId = selectedWinners[match.id];
      
      // Update bracket_data in tournaments table
      await updateBracketData(tournamentData, match, winnerId);

      // Fetch updated matches from bracket_data
      await fetchMatches();
      
      // Trigger visualization refresh - this should happen after database update completes
      if (onMatchUpdate) {
        onMatchUpdate();
      }
      
      alert('Match result locked in successfully!');
    } catch (err) {
      console.error('Error locking in match result:', err);
      alert('Failed to lock in match result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateBracketData = async (tournament, match, winnerId) => {
    if (!tournament?.bracket_data) return;

    const bracketData = { ...tournament.bracket_data };
    const tournamentType = tournament.tournament_type;

    // Update the match in bracket_data
    bracketData.rounds.forEach(round => {
      if (round.matches) {
        round.matches.forEach(bracketMatch => {
          if (bracketMatch.matchId === match.match_id) {
            bracketMatch.winner = winnerId;
            bracketMatch.status = 'completed';
          }
        });
      }
    });

    // Use tournament-specific handler to advance winner to next round
    let updatedBracketData = bracketData;
    try {
      if (tournamentType === 'single_elimination') {
        updatedBracketData = handleMatchCompletion(bracketData, match, winnerId, tournamentType);
      } else if (tournamentType === 'double_elimination') {
        updatedBracketData = handleDoubleElimination(bracketData, match, winnerId, tournamentType);
      } else if (tournamentType === 'round_robin') {
        updatedBracketData = handleRoundRobin(bracketData, match, winnerId, tournamentType);
      } else if (tournamentType === 'swiss') {
        updatedBracketData = handleSwiss(bracketData, match, winnerId, tournamentType);
      }
    } catch (err) {
      console.error('Error updating bracket data:', err);
    }

    // Save updated bracket_data to database
    const { error } = await supabase
      .from('tournaments')
      .update({ bracket_data: updatedBracketData })
      .eq('event_id', eventData.id);

    if (error) throw error;

    // Update tournament_matches table
    const { error: matchError } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('match_id', match.match_id)
      .eq('tournament_id', tournament.id);

    if (matchError) {
      console.error('Error updating tournament_matches:', matchError);
      // Don't throw error for tournament_matches updates as bracket_data is the source of truth
    }
  };

  const updateBracketDataToUnlock = async (tournament, match) => {
    if (!tournament?.bracket_data) return;

    const bracketData = { ...tournament.bracket_data };

    // Remove winner from the match in bracket_data
    bracketData.rounds.forEach(round => {
      if (round.matches) {
        round.matches.forEach(bracketMatch => {
          if (bracketMatch.matchId === match.match_id) {
            bracketMatch.winner = null;
            bracketMatch.status = 'scheduled';
          }
        });
      }
    });

    // Save updated bracket_data to database
    const { error } = await supabase
      .from('tournaments')
      .update({ bracket_data: bracketData })
      .eq('event_id', eventData.id);

    if (error) throw error;
  };

  const unlockMatch = async (match) => {
    try {
      setLoading(true);
      
      // Update bracket_data to remove winner
      await updateBracketDataToUnlock(tournamentData, match);

      // Remove winner from selectedWinners
      setSelectedWinners(prev => {
        const updated = { ...prev };
        delete updated[match.id];
        return updated;
      });

      // Fetch updated matches from bracket_data
      await fetchMatches();
      
      // Trigger visualization refresh
      onMatchUpdate();
      
      alert('Match unlocked. You can now change the result.');
    } catch (err) {
      console.error('Error unlocking match:', err);
      alert('Failed to unlock match. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMatch = (match) => {
    const player1 = getParticipantInfo(match.player1_id);
    const player2 = getParticipantInfo(match.player2_id);
    const selectedWinner = selectedWinners[match.id];
    const isCompleted = match.status === 'completed';
    const matchKey = match.match_id;

    return (
      <div key={match.id} className={styles.matchCard}>
        <div className={styles.matchHeader}>
          <span className={styles.matchId}>{matchKey}</span>
          <span className={styles.roundNumber}>Round {match.round_number}</span>
        </div>
        <div className={styles.matchContent}>
          {/* Player 1 */}
          <div className={styles.playerContainer}>
            <div className={styles.playerInfo}>
              {player1 ? (
                <>
                  <span className={styles.playerName}>{player1.username}</span>
                  {(player1.firstName || player1.lastName) && (
                    <span className={styles.playerFullName}>
                      {`${player1.firstName || ''} ${player1.lastName || ''}`.trim()}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.playerName}>TBD</span>
              )}
            </div>
            <button
              className={`${styles.winnerButton} ${selectedWinner === match.player1_id ? styles.selected : ''}`}
              onClick={() => !isCompleted && handleWinnerSelect(match.id, match.player1_id)}
              disabled={isCompleted || !player1}
            >
              {selectedWinner === match.player1_id ? '✓ Winner' : 'Select'}
            </button>
          </div>

          <div className={styles.vs}>VS</div>

          {/* Player 2 */}
          <div className={styles.playerContainer}>
            <div className={styles.playerInfo}>
              {player2 ? (
                <>
                  <span className={styles.playerName}>{player2.username}</span>
                  {(player2.firstName || player2.lastName) && (
                    <span className={styles.playerFullName}>
                      {`${player2.firstName || ''} ${player2.lastName || ''}`.trim()}
                    </span>
                  )}
                </>
              ) : (
                <span className={styles.playerName}>TBD</span>
              )}
            </div>
            <button
              className={`${styles.winnerButton} ${selectedWinner === match.player2_id ? styles.selected : ''}`}
              onClick={() => !isCompleted && handleWinnerSelect(match.id, match.player2_id)}
              disabled={isCompleted || !player2}
            >
              {selectedWinner === match.player2_id ? '✓ Winner' : 'Select'}
            </button>
          </div>
        </div>
        <div className={styles.matchActions}>
          {isCompleted ? (
            <button
              className={styles.unlockButton}
              onClick={() => unlockMatch(match)}
              disabled={loading}
            >
              Unlock Result
            </button>
          ) : (
            <button
              className={styles.lockInButton}
              onClick={() => handleLockIn(match)}
              disabled={!selectedWinners[match.id] || loading}
            >
              Lock In Result
            </button>
          )}
        </div>
      </div>
    );
  };

  const groupedMatches = matches.reduce((acc, match) => {
    let roundKey;
    if (match.bracket && match.bracket !== 'main') {
      // For double elimination, include bracket type in the key
      roundKey = `${match.bracket.replace('_', ' ').toUpperCase()} - ${match.round_name || `Round ${match.round_number}`}`;
    } else {
      roundKey = match.round_name || `Round ${match.round_number}`;
    }
    
    if (!acc[roundKey]) {
      acc[roundKey] = [];
    }
    acc[roundKey].push(match);
    return acc;
  }, {});

  return (
    <div className={`${styles.scorekeepingPanel} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.panelContent}>
        {!isCollapsed ? (
          <>
            <h2 className={styles.panelTitle}>Scorecard</h2>
            <div className={styles.matchesContainer}>
              {loading ? (
                <div className={styles.loadingText}>Loading matches...</div>
              ) : matches.length === 0 ? (
                <div className={styles.noMatches}>
                  <p>No matches available yet.</p>
                  <p className={styles.hint}>Generate your bracket to see matches here.</p>
                </div>
              ) : (
                Object.entries(groupedMatches).map(([roundName, roundMatches]) => (
                  <div key={roundName} className={styles.roundGroup}>
                    <h3 className={styles.roundName}>{roundName}</h3>
                    <div className={styles.matchesList}>
                      {roundMatches.map(match => renderMatch(match))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className={styles.collapsedContent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.editIcon}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span className={styles.collapsedText}>MAKE YOUR TOURNAMENT LIVE TO EDIT SCORE</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScorekeepingPanel;
