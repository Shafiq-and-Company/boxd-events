import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './VisualizationPanel.module.css';

const VisualizationPanel = ({ eventData, participants, refreshTrigger }) => {
  const [bracketData, setBracketData] = useState(null);
  const [tournamentType, setTournamentType] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchBracketData();
    }
  }, [refreshTrigger, eventData?.id]);

  useEffect(() => {
    fetchBracketData();
  }, [eventData?.id]);

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
            <div className={styles.placeholderContainer}>
              <p className={styles.placeholderText}>
                Bracket visualization awaiting brackets-viewer.js integration
              </p>
              {participants.length > 0 && (
                <p className={styles.participantCount}>
                  {participants.length} participants registered
                </p>
              )}
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
