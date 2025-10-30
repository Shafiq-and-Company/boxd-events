import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import tournamentManager from '../../lib/tournamentManager';
import MatchManager from './MatchManager';
import VerticalBracketViewer from './VerticalBracketViewer';
import ParticipantsList from './ParticipantsList';
import styles from './tournament.module.css';

export default function ManageTournament() {
  const router = useRouter();
  const { id } = router.query;
  const [tournament, setTournament] = useState(null);
  const [gameTitle, setGameTitle] = useState(null);
  const [gameBackgroundImage, setGameBackgroundImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
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
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(tournamentData);
      setSelectedFormat(tournamentData.tournament_type || 'single_elimination');
      
      // Fetch game title from event
      if (tournamentData.event_id) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('game_id, games(game_title, game_background_image_url)')
          .eq('id', tournamentData.event_id)
          .single();

        if (!eventError && eventData && eventData.games) {
          // games is returned as an array, get first element
          const game = Array.isArray(eventData.games) ? eventData.games[0] : eventData.games;
          if (game) {
            if (game.game_title) {
              setGameTitle(game.game_title);
            }
            if (game.game_background_image_url) {
              setGameBackgroundImage(game.game_background_image_url);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = async (e) => {
    const newFormat = e.target.value;
    
    // Confirm before changing format
    if (!confirm('Changing format will reset all matches and bracket data. Continue?')) {
      // Reset select to current format
      e.target.value = selectedFormat;
      return;
    }
    
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
      setRefreshKey(prev => prev + 1);
      await loadTournament();
    } catch (error) {
      console.error('Error changing format:', error);
      alert('Failed to change format: ' + error.message);
      // Reset select to current format on error
      e.target.value = selectedFormat;
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className={styles.loading}>
      <img src="/dance-duck.gif" alt="Loading..." />
    </div>
  );
  if (!tournament) return <div>Tournament not found</div>;

  const handleBackToEvent = () => {
    if (tournament?.event_id) {
      router.push(`/view-event/${tournament.event_id}`);
    }
  };

  return (
    <div 
      className={styles.manageTournament}
      style={gameBackgroundImage ? {
        ['--bg-image']: `url(${gameBackgroundImage})`
      } : {}}
      data-has-background={!!gameBackgroundImage}
    >
      <div className={styles.header}>
        <button 
          className={styles.backButton}
          onClick={handleBackToEvent}
          disabled={!tournament?.event_id}
        >
          ← Back to Event
        </button>
        <h1>
          {tournament.name || 'Tournament Management'}
          {gameTitle && (
            <>
              <span className={styles.titleSeparator}> | </span>
              <span className={styles.gameTitle}>{gameTitle}</span>
            </>
          )}
        </h1>
        <span className={styles.statusBadge}>{tournament.status || 'Active'}</span>
      </div>
      
      <div className={styles.threeColumnLayout}>
        {/* Left Column: Settings, Participants, Danger Zone */}
        <div className={styles.leftColumn}>
          <div className={styles.leftColumnCard}>
            <h2 className={styles.columnTitle}>Configuration</h2>
            <div className={styles.tournamentSettings}>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Format</span>
                <select 
                  value={selectedFormat}
                  onChange={handleFormatChange}
                  className={styles.formatSelect}
                  disabled={loading}
                >
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                </select>
              </div>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Max Participants</span>
                <span className={styles.settingValue}>{tournament.max_participants || 64}</span>
              </div>
              <div className={styles.settingItem}>
                <span className={styles.settingLabel}>Min Participants</span>
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
            <VerticalBracketViewer tournamentId={id} key={`bracket-${refreshKey}`} />
          </div>
        </div>

        {/* Right Column: Current Matches */}
        <div className={styles.rightColumn}>
          <div className={styles.matchesSection}>
            <MatchManager tournamentId={id} onMatchUpdate={handleMatchUpdate} key={`matches-${refreshKey}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
