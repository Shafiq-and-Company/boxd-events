import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import tournamentManager from '../../lib/tournamentManager';
import MatchManager from './MatchManager';
import BracketViewer from './BracketViewer';
import ParticipantsList from './ParticipantsList';
import styles from './tournament.module.css';

export default function ManageTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      loadTournament();
    }
  }, [id]);
  
  const handleMatchUpdate = () => {
    // Trigger a refresh of all components
    setRefreshKey(prev => prev + 1);
  };

  const handleResetTournament = async () => {
    try {
      setLoading(true);
      await tournamentManager.resetTournament(id);
      setRefreshKey(prev => prev + 1);
      await loadTournament();
    } catch (error) {
      console.error('Error resetting tournament:', error);
      alert('Failed to reset tournament: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTournament = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!tournament) return <div>Tournament not found</div>;

  const handleBackToEvent = () => {
    if (tournament?.event_id) {
      router.push(`/event/${tournament.event_id}`);
    }
  };

  return (
    <div className={styles.manageTournament}>
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={handleBackToEvent}
          disabled={!tournament?.event_id}
        >
          ← Back to Event
        </button>
        <h1>{tournament.name || 'Tournament Management'}</h1>
        <span className={styles.statusBadge}>{tournament.status || 'Active'}</span>
      </div>
      
      <div className={styles.threeColumnLayout}>
        {/* Left Column: Settings, Participants, Danger Zone */}
        <div className={styles.leftColumn}>
          <div className={styles.leftColumnCard}>
            <h2 className={styles.columnTitle}>Configuration</h2>
            <div className={styles.tournamentSettings}>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Format:</span>
                <span className={styles.settingValue}>Single Elimination</span>
              </div>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Max Participants:</span>
                <span className={styles.settingValue}>{tournament.max_participants || 64}</span>
              </div>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Min Participants:</span>
                <span className={styles.settingValue}>{tournament.min_participants || 2}</span>
              </div>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.participantsSection}>
              <ParticipantsList tournamentId={id} key={`participants-${refreshKey}`} />
            </div>

            <div className={styles.divider}></div>

            <div className={styles.resetSection}>
              <h3>Danger Zone</h3>
              <p>Reset the tournament to start fresh. This will clear all matches and bracket data.</p>
              <button 
                className={styles.resetButton}
                onClick={handleResetTournament}
              >
                Reset Tournament
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column: Bracket Viewer */}
        <div className={styles.middleColumn}>
          <div className={styles.bracketSection}>
            <h2 className={styles.columnTitle}>Bracket</h2>
            <BracketViewer tournamentId={id} key={`bracket-${refreshKey}`} />
          </div>
        </div>

        {/* Right Column: Current Matches */}
        <div className={styles.rightColumn}>
          <div className={styles.matchesSection}>
            <h2 className={styles.columnTitle}>Scorecard</h2>
            <MatchManager tournamentId={id} onMatchUpdate={handleMatchUpdate} key={`matches-${refreshKey}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
