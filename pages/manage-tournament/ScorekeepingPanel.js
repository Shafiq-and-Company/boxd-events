import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
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
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (error) throw error;
      setTournamentData(tournament);
      
      // Initialize with empty matches for now
      setMatches([]);
    } catch (err) {
      console.error('Error fetching tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCollapsed && eventData) {
      fetchMatches();
    }
  }, [eventData, isCollapsed]);

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

    console.log('Lock in match result - awaiting brackets-manager integration');
    // TODO: Implement with brackets-manager.js
  };

  const unlockMatch = async (match) => {
    console.log('Unlock match - awaiting brackets-manager integration');
    // TODO: Implement with brackets-manager.js
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
