import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import TournamentManager from '../../components/TournamentManager';
import TournamentBracket from '../../components/TournamentBracket';
import styles from '../../components/TournamentManager.module.css';

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

  return (
    <div className={styles.manageTournament}>
      <h1>{tournament.name || 'Tournament Management'}</h1>
      
      <div className={styles.tabs}>
        <button 
          className={activeTab === 'manage' ? styles.active : ''}
          onClick={() => setActiveTab('manage')}
        >
          Manage
        </button>
        <button 
          className={activeTab === 'bracket' ? styles.active : ''}
          onClick={() => setActiveTab('bracket')}
        >
          View Bracket
        </button>
      </div>

      {activeTab === 'manage' && (
        <TournamentManager tournamentId={id} />
      )}

      {activeTab === 'bracket' && (
        <TournamentBracket tournamentId={id} />
      )}
    </div>
  );
}
