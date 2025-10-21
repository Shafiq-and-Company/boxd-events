import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './UpNextCard.module.css';

const UpNextCard = ({ eventData, refreshTrigger, onMatchUpdate }) => {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch upcoming matches when eventData changes or refresh is triggered
  useEffect(() => {
    if (eventData?.id) {
      fetchUpcomingMatches();
    }
  }, [eventData?.id, refreshTrigger]);

  const fetchUpcomingMatches = async () => {
    if (!eventData?.id) return;

    setIsLoading(true);
    try {
      // First get the tournament for this event
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('event_id', eventData.id)
        .single();

      if (tournamentError || !tournament) {
        console.log('No tournament found for this event');
        setUpcomingMatches([]);
        return;
      }

      // Fetch upcoming matches (scheduled and in_progress)
      const { data: matches, error: matchesError } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:users!tournament_matches_player1_id_fkey(id, first_name, last_name, username),
          player2:users!tournament_matches_player2_id_fkey(id, first_name, last_name, username)
        `)
        .eq('tournament_id', tournament.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('round_number', { ascending: true })
        .order('match_id', { ascending: true });

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return;
      }

      setUpcomingMatches(matches || []);
    } catch (error) {
      console.error('Error fetching upcoming matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    setSelectedWinner(null);
  };

  const handleWinnerSelect = (winnerId) => {
    setSelectedWinner(winnerId);
  };

  const startMatch = async (matchId) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;

      // Refresh matches
      await fetchUpcomingMatches();
      setSelectedMatch(null);
      
      // Trigger bracket visualization refresh
      if (onMatchUpdate) {
        onMatchUpdate();
      }
    } catch (error) {
      console.error('Error starting match:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const completeMatch = async () => {
    if (!selectedMatch || !selectedWinner) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: selectedWinner,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', selectedMatch.id);

      if (error) throw error;

      // Refresh matches
      await fetchUpcomingMatches();
      setSelectedMatch(null);
      setSelectedWinner(null);
      
      // Trigger bracket visualization refresh
      if (onMatchUpdate) {
        onMatchUpdate();
      }
    } catch (error) {
      console.error('Error completing match:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPlayerName = (player) => {
    if (!player) return 'TBD';
    return player.username || `${player.first_name} ${player.last_name}`;
  };

  const getMatchStatus = (status) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className={styles.upNextCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Up Next</h3>
        {upcomingMatches.length > 0 && (
          <div className={styles.roundInfo}>
            <div className={styles.roundName}>
              {upcomingMatches[0]?.round_number ? `Round ${upcomingMatches[0].round_number}` : 'Tournament'}
            </div>
            <div className={styles.roundNumber}>
              {upcomingMatches.length} match{upcomingMatches.length !== 1 ? 'es' : ''}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p>Loading matches...</p>
        </div>
      ) : upcomingMatches.length > 0 ? (
        <div className={styles.matchesList}>
          {upcomingMatches.map((match) => (
            <div 
              key={match.id} 
              className={`${styles.matchItem} ${match.status === 'in_progress' ? styles.inProgress : ''}`}
              onClick={() => handleMatchClick(match)}
            >
              <div className={styles.matchPlayers}>
                <div className={styles.player}>
                  <div className={styles.playerName}>{getPlayerName(match.player1)}</div>
                </div>
                <div className={styles.vs}>VS</div>
                <div className={styles.player}>
                  <div className={styles.playerName}>{getPlayerName(match.player2)}</div>
                </div>
              </div>
              <div className={styles.matchStatus}>
                {getMatchStatus(match.status)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4"/>
              <path d="M16 2v4"/>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <path d="M3 10h18"/>
              <path d="M8 14h.01"/>
              <path d="M12 14h.01"/>
              <path d="M16 14h.01"/>
              <path d="M8 18h.01"/>
              <path d="M12 18h.01"/>
              <path d="M16 18h.01"/>
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No Upcoming Matches</h3>
          <p className={styles.emptyDescription}>
            Tournament matches will appear here once the tournament begins and participants are seeded.
          </p>
        </div>
      )}

      {/* Match Management Modal */}
      {selectedMatch && (
        <div className={styles.matchModal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{selectedMatch.match_id}</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setSelectedMatch(null)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.matchInfo}>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>{getPlayerName(selectedMatch.player1)}</div>
                <button 
                  className={`${styles.winnerButton} ${selectedWinner === selectedMatch.player1_id ? styles.selected : ''}`}
                  onClick={() => handleWinnerSelect(selectedMatch.player1_id)}
                  disabled={selectedMatch.status === 'scheduled'}
                >
                  Winner
                </button>
              </div>
              <div className={styles.vs}>VS</div>
              <div className={styles.playerInfo}>
                <div className={styles.playerName}>{getPlayerName(selectedMatch.player2)}</div>
                <button 
                  className={`${styles.winnerButton} ${selectedWinner === selectedMatch.player2_id ? styles.selected : ''}`}
                  onClick={() => handleWinnerSelect(selectedMatch.player2_id)}
                  disabled={selectedMatch.status === 'scheduled'}
                >
                  Winner
                </button>
              </div>
            </div>

            <div className={styles.modalActions}>
              {selectedMatch.status === 'scheduled' ? (
                <button 
                  className={styles.startButton}
                  onClick={() => startMatch(selectedMatch.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Starting...' : 'Start Match'}
                </button>
              ) : (
                <button 
                  className={styles.completeButton}
                  onClick={completeMatch}
                  disabled={isUpdating || !selectedWinner}
                >
                  {isUpdating ? 'Completing...' : 'Complete Match'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpNextCard;
