import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import TournamentManagement from '../../components/TournamentManagement';
import TournamentBracket from '../../components/TournamentBracket';
import styles from '../../components/TournamentManagement.module.css';

export default function ManageTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [tournament, setTournament] = useState(null);
  const [activeTab, setActiveTab] = useState('manage');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadTournament();
    }
  }, [id]);

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
      </div>
      
      <div className={styles.tournamentInfo}>
        <div className={styles.tournamentSettings}>
          <h3>Tournament Settings</h3>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Format:</span>
            <span className={styles.settingValue}>Single Elimination</span>
          </div>
          <div className={styles.settingItem}>
            <span className={styles.settingLabel}>Status:</span>
            <span className={styles.settingValue}>{tournament.status || 'Active'}</span>
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
      </div>
      
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'manage' ? styles.active : ''}
          onClick={() => setActiveTab('manage')}
        >
          Manage Matches
        </button>
        <button 
          className={activeTab === 'bracket' ? styles.active : ''}
          onClick={() => setActiveTab('bracket')}
        >
          View Bracket
        </button>
      </div>

      {activeTab === 'manage' && (
        <TournamentManagement tournamentId={id} />
      )}

      {activeTab === 'bracket' && (
        <TournamentBracket tournamentId={id} />
      )}
    </div>
  );
}
