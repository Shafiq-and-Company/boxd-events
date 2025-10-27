import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './VisualizationPanel.module.css';

const VisualizationPanel = ({ eventData, participants, refreshTrigger }) => {
  const [bracketData, setBracketData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch bracket data from tournaments table
  const fetchBracketData = async () => {
    if (!eventData?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('bracket_data')
        .eq('event_id', eventData.id)
        .single();

      if (error) throw error;
      setBracketData(data?.bracket_data || null);
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

  // Create a mapping of user_id to username
  const participantsMap = useMemo(() => {
    const map = {};
    participants.forEach(participant => {
      map[participant.user_id] = participant.users?.username || 'Unknown';
    });
    return map;
  }, [participants]);

  // Get player username
  const getPlayerName = (player) => {
    if (!player || !player.id) return '-';
    return participantsMap[player.id] || 'Unknown';
  };

  // Render a match
  const renderMatch = (match, matchIndex, roundIndex, isLastRound) => {
    const isCompleted = match.status === 'completed';
    const hasWinner = match.winner && isCompleted;
    
    return (
      <div key={match.matchId} className={styles.matchContainer}>
        <div className={`${styles.match} ${isCompleted ? styles.completed : ''}`}>
          <div 
            className={`${styles.playerSlot} ${match.player1?.id === match.winner && hasWinner ? styles.winner : ''}`}
          >
            {getPlayerName(match.player1)}
          </div>
          <div className={styles.vs}>vs</div>
          <div 
            className={`${styles.playerSlot} ${match.player2?.id === match.winner && hasWinner ? styles.winner : ''}`}
          >
            {getPlayerName(match.player2)}
          </div>
        </div>
        {!isLastRound && (
          <div className={styles.connector}></div>
        )}
      </div>
    );
  };

  // Render a round
  const renderRound = (round, roundIndex) => {
    const isLastRound = roundIndex === bracketData.rounds.length - 1;
    
    // Group matches by bracket type for double elimination
    const groupedMatches = round.matches || [];
    
    return (
      <div key={round.roundNumber} className={styles.round}>
        <div className={styles.roundTitle}>
          {round.bracket ? `${round.bracket}: ${round.name}` : round.name}
        </div>
        <div className={styles.matches}>
          {groupedMatches.map((match, matchIndex) => 
            renderMatch(match, matchIndex, roundIndex, isLastRound)
          )}
        </div>
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
              <p className={styles.loadingText}>Loading bracket...</p>
            </div>
          ) : bracketData && bracketData.rounds ? (
            <div className={styles.bracketVisualization}>
              {bracketData.rounds.map((round, index) => renderRound(round, index))}
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
