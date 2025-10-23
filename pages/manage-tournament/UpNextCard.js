import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { handleMatchCompletion, updateDatabaseMatches } from '../../lib/singleElimination';
import { handleMatchCompletion as handleDoubleEliminationMatchCompletion } from '../../lib/doubleElimination';
import { handleMatchCompletion as handleRoundRobinMatchCompletion } from '../../lib/roundRobin';
import { handleMatchCompletion as handleSwissMatchCompletion } from '../../lib/swiss';
import styles from './UpNextCard.module.css';

const UpNextCard = ({ eventData, refreshTrigger, onMatchUpdate }) => {
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

      console.log('Upcoming matches found:', matches?.length || 0);
      console.log('Matches data:', matches);

      // Debug: Also fetch all matches to see what's in the database
      const { data: allMatches, error: allMatchesError } = await supabase
        .from('tournament_matches')
        .select(`
          *,
          player1:users!tournament_matches_player1_id_fkey(id, first_name, last_name, username),
          player2:users!tournament_matches_player2_id_fkey(id, first_name, last_name, username)
        `)
        .eq('tournament_id', tournament.id)
        .order('round_number', { ascending: true })
        .order('match_id', { ascending: true });

      if (!allMatchesError) {
        console.log('All matches in database:', allMatches?.length || 0);
        console.log('All matches data:', allMatches);
      }

      setUpcomingMatches(matches || []);
    } catch (error) {
      console.error('Error fetching upcoming matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWinnerSelect = (matchId, winnerId) => {
    completeMatch(matchId, winnerId);
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

  const completeMatch = async (matchId, winnerId) => {
    if (!matchId || !winnerId) return;

    setIsUpdating(true);
    try {
      // Find the match data
      const match = upcomingMatches.find(m => m.id === matchId);
      if (!match) return;

      // Update the match
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Get tournament data to update bracket
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (tournamentError) throw tournamentError;

      // Get the appropriate match completion handler based on tournament type
      let matchCompletionHandler;
      switch (tournament.tournament_type) {
        case 'single_elimination':
          matchCompletionHandler = handleMatchCompletion;
          break;
        case 'double_elimination':
          matchCompletionHandler = handleDoubleEliminationMatchCompletion;
          break;
        case 'round_robin':
          matchCompletionHandler = handleRoundRobinMatchCompletion;
          break;
        case 'swiss':
          matchCompletionHandler = handleSwissMatchCompletion;
          break;
        default:
          throw new Error(`Unsupported tournament type: ${tournament.tournament_type}`);
      }

      // Update bracket data with the match result
      const updatedBracketData = matchCompletionHandler(
        tournament.bracket_data, 
        match, 
        winnerId, 
        tournament.tournament_type
      );
      
      // Update tournament bracket_data
      const { error: bracketError } = await supabase
        .from('tournaments')
        .update({
          bracket_data: updatedBracketData,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (bracketError) throw bracketError;

      // Update database matches with new player assignments
      await updateDatabaseMatches(tournament.id, updatedBracketData, supabase);

      // Refresh matches
      await fetchUpcomingMatches();
      
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
              className={`${styles.matchItem} ${match.status === 'in_progress' ? styles.inProgress : ''} ${(!match.player1_id || !match.player2_id) ? styles.disabled : ''}`}
            >
              {/* Status Icons */}
              <div className={styles.statusIcons}>
                {(!match.player1_id || !match.player2_id) ? (
                  <div className={styles.statusIcon} title="Waiting for players">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                  </div>
                ) : match.status === 'scheduled' ? (
                  <button 
                    className={styles.statusIcon}
                    onClick={() => startMatch(match.id)}
                    disabled={isUpdating}
                    title="Start Match"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5,3 19,12 5,21"></polygon>
                    </svg>
                  </button>
                ) : match.status === 'in_progress' ? (
                  <div className={styles.statusIcon} title="Match in progress">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12,6 12,12 16,14"></polyline>
                    </svg>
                  </div>
                ) : match.status === 'completed' ? (
                  <div className={styles.statusIcon} title="Match completed">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22,4 12,14.01 9,11.01"></polyline>
                    </svg>
                  </div>
                ) : null}
              </div>
              
              <div className={styles.matchPlayers}>
                <div className={styles.player}>
                  {match.status === 'in_progress' ? (
                    <div className={styles.playerContainer}>
                      <button 
                        className={styles.playerName}
                        onClick={() => handleWinnerSelect(match.id, match.player1_id)}
                        disabled={isUpdating}
                      >
                        {getPlayerName(match.player1)}
                      </button>
                      <div className={styles.floatingTooltip}>Declare winner</div>
                    </div>
                  ) : (
                    <div className={styles.playerName}>{getPlayerName(match.player1)}</div>
                  )}
                </div>
                <div className={styles.vs}>VS</div>
                <div className={styles.player}>
                  {match.status === 'in_progress' ? (
                    <div className={styles.playerContainer}>
                      <button 
                        className={styles.playerName}
                        onClick={() => handleWinnerSelect(match.id, match.player2_id)}
                        disabled={isUpdating}
                      >
                        {getPlayerName(match.player2)}
                      </button>
                      <div className={styles.floatingTooltip}>Declare winner</div>
                    </div>
                  ) : (
                    <div className={styles.playerName}>{getPlayerName(match.player2)}</div>
                  )}
                </div>
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

    </div>
  );
};

export default UpNextCard;
