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
  const [isEditingFormat, setIsEditingFormat] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('single_elimination');

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
      setSelectedFormat(data.tournament_type || 'single_elimination');
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = async (newFormat) => {
    try {
      setLoading(true);
      
      // Update tournament format in database
      const { error } = await supabase
        .from('tournaments')
        .update({ tournament_type: newFormat })
        .eq('id', id);

      if (error) throw error;

      // Regenerate tournament with new format
      await tournamentManager.resetTournament(id);
      
      setSelectedFormat(newFormat);
      setIsEditingFormat(false);
      setRefreshKey(prev => prev + 1);
      await loadTournament();
    } catch (error) {
      console.error('Error changing format:', error);
      alert('Failed to change format: ' + error.message);
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
                {isEditingFormat ? (
                  <div className={styles.formatSelector}>
                    <span className={styles.settingLabel}>Format</span>
                    <select 
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className={styles.formatSelect}
                    >
                      <option value="single_elimination">Single Elimination</option>
                      <option value="double_elimination">Double Elimination</option>
                    </select>
                    <div className={styles.formatButtons}>
                      <button 
                        className={styles.formatSaveButton}
                        onClick={() => handleFormatChange(selectedFormat)}
                      >
                        Save
                      </button>
                      <button 
                        className={styles.formatCancelButton}
                        onClick={() => {
                          setIsEditingFormat(false);
                          setSelectedFormat(tournament.tournament_type || 'single_elimination');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.formatDisplay}>
                    <span className={styles.settingLabel}>Format:</span>
                    <span className={styles.settingValue}>
                      {selectedFormat === 'double_elimination' ? 'Double Elimination' : 'Single Elimination'}
                    </span>
                    <button 
                      className={styles.formatEditButton}
                      onClick={() => setIsEditingFormat(true)}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              {selectedFormat === 'double_elimination' && (
                <div className={styles.formatNote}>
                  <span className={styles.noteIcon}>ℹ️</span>
                  <span className={styles.noteText}>
                    Grand Finals Reset enabled: If loser's bracket winner wins the first grand final, a reset match will be played.
                  </span>
                </div>
              )}
              <div className={styles.settingItemHorizontal}>
                <span className={styles.settingLabel}>Max Participants:</span>
                <span className={styles.settingValue}>{tournament.max_participants || 64}</span>
              </div>
              <div className={styles.settingItemHorizontal}>
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
