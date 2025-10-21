import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './BracketVisualization.module.css';

const BracketVisualization = ({ eventData, refreshTrigger }) => {
  const [bracketData, setBracketData] = useState({ rounds: [] });
  const [tournamentInfo, setTournamentInfo] = useState({
    participantCount: 0,
    tournamentFormat: 'Single Elimination'
  });

  // Fetch tournament data when eventData changes or refresh is triggered
  useEffect(() => {
    if (eventData?.id) {
      fetchTournamentData();
    }
  }, [eventData?.id, refreshTrigger]);

  const fetchTournamentData = async () => {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventData.id)
        .single();

      if (tournament && !error) {
        setBracketData(tournament.bracket_data || { rounds: [] });
        setTournamentInfo({
          participantCount: tournament.bracket_data?.participants?.length || 0,
          tournamentFormat: getTournamentFormatName(tournament.tournament_type)
        });
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
    }
  };

  const getTournamentFormatName = (type) => {
    const formats = {
      'single_elimination': 'Single Elimination',
      'double_elimination': 'Double Elimination',
      'round_robin': 'Round Robin',
      'swiss': 'Swiss'
    };
    return formats[type] || 'Single Elimination';
  };

  // Bracket visualization is read-only - no editing functionality

  return (
    <div className={styles.bracketContainer}>
      <div className={styles.bracketHeader}>
        <h2 className={styles.bracketTitle}>Tournament Bracket</h2>
        <div className={styles.bracketInfo}>
          <span className={styles.participantCount}>{tournamentInfo.participantCount} Players</span>
          <span className={styles.tournamentFormat}>{tournamentInfo.tournamentFormat}</span>
        </div>
      </div>

      <div className={styles.bracketContent}>
        {bracketData.rounds.length > 0 ? (
          bracketData.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className={styles.round}>
              <h3 className={styles.roundTitle}>{round.name}</h3>
              <div className={styles.matches}>
                {round.matches.map((match) => (
                  <div 
                    key={match.matchId} 
                    className={styles.match}
                  >
                    <div className={styles.matchHeader}>
                      <span className={styles.matchNumber}>{match.matchId}</span>
                      <span className={styles.matchStatus}>
                        {match.winner ? 'Completed' : match.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className={styles.players}>
                      <div className={`${styles.player} ${match.winner === match.player1?.id ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player1?.name || 'TBD'}</span>
                        <span className={styles.playerScore}>{match.player1Score || '-'}</span>
                      </div>
                      <div className={`${styles.player} ${match.winner === match.player2?.id ? styles.winner : ''}`}>
                        <span className={styles.playerName}>{match.player2?.name || 'TBD'}</span>
                        <span className={styles.playerScore}>{match.player2Score || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
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
            <h3 className={styles.emptyTitle}>No Bracket Yet</h3>
            <p className={styles.emptyDescription}>
              Tournament bracket will appear here once players are added.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default BracketVisualization;
